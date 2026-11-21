<?php
declare(strict_types=1);
const IG_APP_ID='1346667754213335';
const IG_CALLBACK=PUBLIC_ORIGIN.'/api/instagram/callback';
function ig_secret(): string {static $s;if($s!==null)return $s;$file=data_dir().'/instagram-settings.php';$cfg=is_file($file)?require $file:[];return $s=(string)($cfg['app_secret']??'');}
function ig_request(string $url,?array $post=null,?string $token=null,bool $form=false): array {
    $c=curl_init($url);$headers=['Accept: application/json'];if($token)$headers[]='Authorization: Bearer '.$token;
    curl_setopt_array($c,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>20,CURLOPT_CONNECTTIMEOUT=>8,CURLOPT_FOLLOWLOCATION=>false,CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS]);
    if($post!==null){$headers[]=$form?'Content-Type: application/x-www-form-urlencoded':'Content-Type: application/json';curl_setopt($c,CURLOPT_POST,true);curl_setopt($c,CURLOPT_POSTFIELDS,$form?http_build_query($post):json_encode($post,JSON_THROW_ON_ERROR));}
    curl_setopt($c,CURLOPT_HTTPHEADER,$headers);$raw=curl_exec($c);$status=curl_getinfo($c,CURLINFO_HTTP_CODE);curl_close($c);
    $data=is_string($raw)?json_decode($raw,true):null;
    if($status<200||$status>=300||!is_array($data)||isset($data['error']))throw new RuntimeException('O Instagram não confirmou esta etapa. Verifique a conexão e tente novamente.');
    return $data;
}
function ig_graph(string $path,string $token,?array $post=null): array {return ig_request('https://graph.instagram.com/v25.0'.$path,$post,$token);}
function ig_encrypt(string $value,bool $decrypt=false): string {
    $key=hash('sha256',ig_secret().':catalogo-hostinger-v1',true);
    if($decrypt){$p=explode('.',$value);if(count($p)!==3)throw new RuntimeException('Reconecte o Instagram.');$v=openssl_decrypt(base64_decode($p[2],true),'aes-256-gcm',$key,OPENSSL_RAW_DATA,base64_decode($p[0],true),base64_decode($p[1],true));if($v===false)throw new RuntimeException('Reconecte o Instagram.');return $v;}
    $iv=random_bytes(12);$tag='';$v=openssl_encrypt($value,'aes-256-gcm',$key,OPENSSL_RAW_DATA,$iv,$tag);if($v===false)throw new RuntimeException('Não foi possível proteger a conexão.');return base64_encode($iv).'.'.base64_encode($tag).'.'.base64_encode($v);
}
function ig_connection(): ?array {
    $c=one('SELECT * FROM instagram_connection WHERE id=?',[PROFILE]);if(!$c)return null;
    if($c['expires_at']<=time())throw new RuntimeException('A autorização expirou. Conecte novamente.');
    $token=ig_encrypt($c['encrypted_token'],true);
    if($c['expires_at']-time()<14*86400){$d=ig_request('https://graph.instagram.com/refresh_access_token?'.http_build_query(['grant_type'=>'ig_refresh_token','access_token'=>$token]));if(!empty($d['access_token'])&&!empty($d['expires_in'])){$token=$d['access_token'];$c['expires_at']=time()+(int)$d['expires_in'];sql('UPDATE instagram_connection SET encrypted_token=?,expires_at=? WHERE id=?',[ig_encrypt($token),$c['expires_at'],PROFILE]);}}
    $me=ig_graph('/me?fields=user_id,username,account_type',$token);
    if(strtolower($me['username']??'')!==PROFILE||(string)($me['user_id']??$me['id']??'')!==$c['instagram_id'])throw new RuntimeException('Conta recusada. Conecte somente @crediti.oficial.');
    $c['token']=$token;return $c;
}
function ig_summary(array $j): array {return ['id'=>$j['id'],'format'=>$j['format'],'status'=>$j['status'],'published'=>count(array_filter($j['items'],fn($x)=>$x['published'])),'total'=>count($j['items']),'error'=>$j['error']??null,'profile'=>PROFILE];}
function ig_save(array $j): void {sql('UPDATE instagram_jobs SET status=?,items=?,error=?,locked_until=?,updated_at=? WHERE id=?',[$j['status'],json_encode($j['items'],JSON_THROW_ON_ERROR),$j['error']??null,time()+90,time(),$j['id']]);}
function ig_advance(string $id,string $owner,array $c): array {
    sql("UPDATE instagram_jobs SET locked_until=? WHERE id=? AND owner_id=? AND locked_until<?",[time()+90,$id,$owner,time()]);$claimed=db()->changes()>0;
    $j=one('SELECT * FROM instagram_jobs WHERE id=? AND owner_id=?',[$id,$owner]);if(!$j)throw new RuntimeException('Publicação não encontrada.');$j['items']=json_decode($j['items'],true);
    if(!$claimed)return ig_summary($j);
    try{
        if(in_array($j['status'],['completed','failed','uncertain'],true))return ig_summary($j);
        if($j['status']==='creating'){$j['status']='failed';$j['error']='A preparação foi interrompida. Nenhuma publicação foi iniciada.';ig_save($j);return ig_summary($j);}
        foreach($j['items'] as &$item){
            if($item['published'])continue;
            $s=ig_graph('/'.$item['container'].'?fields=status_code',$c['token']);
            if(($s['status_code']??'')==='PUBLISHED'){$item['published']=true;$item['inflight']=false;ig_save($j);continue;}
            if($item['inflight']){$j['status']='uncertain';$j['error']='Confira o perfil antes de repetir. O Instagram ainda não confirmou o envio.';ig_save($j);return ig_summary($j);}
            if(in_array($s['status_code']??'',['ERROR','EXPIRED'],true)){$j['status']='failed';$j['error']='O Instagram não conseguiu preparar uma foto. As já publicadas não serão reenviadas.';ig_save($j);return ig_summary($j);}
            if(($s['status_code']??'')!=='FINISHED')return ig_summary($j);
            $item['inflight']=true;ig_save($j);
            try{$d=ig_graph('/'.$c['instagram_id'].'/media_publish',$c['token'],['creation_id'=>$item['container']]);if(empty($d['id']))throw new RuntimeException();$item['mediaId']=$d['id'];$item['published']=true;$item['inflight']=false;ig_save($j);}
            catch(Throwable){$j['status']='uncertain';$j['error']='Não foi possível confirmar a publicação. Confira @crediti.oficial antes de repetir.';ig_save($j);return ig_summary($j);}
        }unset($item);
        $j['status']='completed';ig_save($j);return ig_summary($j);
    }finally{sql('UPDATE instagram_jobs SET locked_until=0 WHERE id=?',[$id]);}
}
function instagram(string $method): never {
    header('Referrer-Policy: no-referrer');$action=$_GET['action']??'status';
    if(in_array($action,['publish','job'],true))fail('Publicação direta desativada. Atualize o catálogo para enviar as fotos ao Instagram e editar antes de publicar.',410);
    if($action==='health')respond(['configured'=>ig_secret()!=='','profile'=>PROFILE]);
    if(ig_secret()==='')fail('A conexão está sendo finalizada. Falta autorizar @crediti.oficial no catálogo.',503);
    try{
        if($action==='callback'&&$method==='GET'){
            $state=$_GET['state']??'';if(!preg_match('/^[a-f0-9]{64}$/',$state))fail('Autorização inválida.');
            db()->exec('BEGIN IMMEDIATE');$s=one('SELECT * FROM instagram_oauth WHERE state_hash=?',[hash('sha256',$state)]);sql('DELETE FROM instagram_oauth WHERE state_hash=?',[hash('sha256',$state)]);db()->exec('COMMIT');
            if(!$s||$s['expires']<time())fail('Esta autorização expirou. Comece novamente no catálogo.');
            if(isset($_GET['error'])){header('Location: '.PUBLIC_ORIGIN.'/admin?instagram=cancelled',true,303);exit;}
            $code=$_GET['code']??'';if(!$code)fail('Código de autorização ausente.');
            $d=ig_request('https://api.instagram.com/oauth/access_token',['client_id'=>IG_APP_ID,'client_secret'=>ig_secret(),'grant_type'=>'authorization_code','redirect_uri'=>IG_CALLBACK,'code'=>$code],null,true);$short=$d['data'][0]??$d;
            $per=$short['permissions']??[];if(!is_array($per))$per=explode(',',$per);
            if(empty($short['access_token'])||!in_array('instagram_business_content_publish',$per,true))fail('Faltou permitir a publicação. Conecte novamente.',403);
            $me=ig_graph('/me?fields=user_id,username,account_type',$short['access_token']);if(strtolower($me['username']??'')!==PROFILE)fail('Conta recusada. Conecte somente @crediti.oficial.',403);
            $long=ig_request('https://graph.instagram.com/access_token?'.http_build_query(['grant_type'=>'ig_exchange_token','client_secret'=>ig_secret(),'access_token'=>$short['access_token']]));
            if(empty($long['access_token'])||empty($long['expires_in']))throw new RuntimeException('Não foi possível concluir a conexão.');
            sql('INSERT OR REPLACE INTO instagram_connection VALUES(?,?,?,?,?)',[PROFILE,(string)($me['user_id']??$me['id']),ig_encrypt($long['access_token']),$me['account_type']??'',time()+(int)$long['expires_in']]);
            header('Location: '.PUBLIC_ORIGIN.'/admin?instagram=connected',true,303);exit;
        }
        $u=admin($method==='POST');$owner=$u['admin_id'];
        if($action==='status'&&$method==='GET'){$c=ig_connection();respond(['profile'=>PROFILE,'connected'=>(bool)$c,'stories'=>$c&&$c['account_type']==='BUSINESS','expiresAt'=>$c?gmdate('c',$c['expires_at']):null]);}
        if($action==='connect'&&$method==='POST'){
            $state=bin2hex(random_bytes(32));sql('DELETE FROM instagram_oauth WHERE expires<?',[time()]);sql('INSERT INTO instagram_oauth VALUES(?,?,?)',[hash('sha256',$state),$owner,time()+600]);
            respond(['url'=>'https://www.instagram.com/oauth/authorize?'.http_build_query(['client_id'=>IG_APP_ID,'redirect_uri'=>IG_CALLBACK,'response_type'=>'code','scope'=>'instagram_business_basic,instagram_business_content_publish','state'=>$state,'force_reauth'=>'true','enable_fb_login'=>'false'])]);
        }
        if($action==='job'&&$method==='POST'){$id=$_GET['id']??'';if(!valid_id($id))fail('Publicação inválida.');$c=ig_connection();if(!$c)fail('Conecte o perfil novamente.',409);respond(ig_advance($id,$owner,$c));}
        if($action==='publish'&&$method==='POST'){
            $b=body();$id=$b['id']??'';$vid=$b['vehicleId']??'';$ids=$b['photoIds']??[];$format=$b['format']??'';$caption=$b['caption']??'';
            if(!valid_id($id)||!valid_id($vid)||!is_array($ids)||count($ids)<1||count($ids)>5||count(array_unique($ids))!==count($ids)||!in_array($format,['feed','stories'],true))fail('Selecione de uma a cinco fotos.');
            if(!is_string($caption)||preg_match_all('/./us',$caption)>2200)fail('A legenda deve ter até 2.200 caracteres.');
            $c=ig_connection();if(!$c)fail('Conecte @crediti.oficial antes de publicar.',409);if($format==='stories'&&$c['account_type']!=='BUSINESS')fail('Stories exigem uma conta empresarial.',409);
            $hash=hash('sha256',json_encode([$vid,$ids,$format,$caption],JSON_THROW_ON_ERROR));$existing=one('SELECT * FROM instagram_jobs WHERE id=?',[$id]);
            if($existing){if($existing['owner_id']!==$owner||$existing['payload_hash']!==$hash)fail('Esta tentativa já pertence a outra publicação.',409);respond(ig_advance($id,$owner,$c));}
            $photos=[];
            foreach($ids as $pid){if(!is_string($pid)||!valid_id($pid))fail('Foto inválida.');$p=one('SELECT f.* FROM fotos_veiculo f JOIN veiculos v ON v.id=f.veiculo_id WHERE f.id=? AND f.veiculo_id=? AND v.deleted_at IS NULL',[$pid,$vid]);if(!$p)fail('Foto não pertence ao veículo.');$name=media_name($p['url_foto']);if(!is_file(media_path($name)))fail('Foto indisponível.');$photos[]=PUBLIC_ORIGIN.'/media/'.$name;}
            $j=['id'=>$id,'owner_id'=>$owner,'payload_hash'=>$hash,'format'=>$format,'status'=>'creating','items'=>[],'error'=>null];
            try{sql('INSERT INTO instagram_jobs VALUES(?,?,?,?,?,?,?,?,?,?)',[$id,$owner,$hash,$format,'creating','[]',null,time()+90,time(),time()]);}catch(Throwable){fail('Esta tentativa já está em andamento.',409);}
            try{$children=[];foreach($photos as $url){$args=['image_url'=>$url];if($format==='stories')$args['media_type']='STORIES';elseif(count($photos)>1)$args['is_carousel_item']=true;else $args['caption']=$caption;$d=ig_graph('/'.$c['instagram_id'].'/media',$c['token'],$args);if(empty($d['id']))throw new RuntimeException('O Instagram não preparou a foto.');$children[]=$d['id'];if($format==='stories'||count($photos)===1)$j['items'][]=['container'=>$d['id'],'published'=>false,'inflight'=>false];ig_save($j);}
                if($format==='feed'&&count($children)>1){$d=ig_graph('/'.$c['instagram_id'].'/media',$c['token'],['media_type'=>'CAROUSEL','children'=>$children,'caption'=>$caption]);if(empty($d['id']))throw new RuntimeException('O Instagram não preparou o carrossel.');$j['items'][]=['container'=>$d['id'],'published'=>false,'inflight'=>false];}
                $j['status']='processing';ig_save($j);
            }catch(Throwable $e){$j['status']='failed';$j['error']=$e->getMessage();ig_save($j);}
            finally{sql('UPDATE instagram_jobs SET locked_until=0 WHERE id=?',[$id]);}
            respond($j['status']==='failed'?ig_summary($j):ig_advance($id,$owner,$c));
        }
        fail('Operação não encontrada.',404);
    }catch(Throwable){fail('Não foi possível concluir a conexão com o Instagram. Confira a autorização e tente novamente.',502);}
}
