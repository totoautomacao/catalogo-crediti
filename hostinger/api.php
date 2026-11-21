<?php
declare(strict_types=1);
require __DIR__.'/runtime.php';
header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');
try {
    request_origin();
    $route=trim((string)($_GET['route']??''),'/');$method=$_SERVER['REQUEST_METHOD'];
    if($route==='health'){respond(['ok'=>true,'backend'=>'hostinger','vehicles'=>(int)db()->querySingle('SELECT count(*) FROM veiculos WHERE deleted_at IS NULL'),'photos'=>(int)db()->querySingle('SELECT count(*) FROM fotos_veiculo'),'version'=>42]);}
    if($route==='auth/session'){
        $u=session_user();respond(['authenticated'=>(bool)$u,'csrf'=>$u['csrf']??null,'email'=>$u['email']??null]);
    }
    if($route==='auth/login'&&$method==='POST'){
        same_origin();$b=body();$ip=hash('sha256',($_SERVER['REMOTE_ADDR']??'').':catalogo');$now=time();
        sql('DELETE FROM attempts WHERE window_start<?',[$now-900]);
        db()->exec('BEGIN IMMEDIATE');
        $attempt=one('SELECT count FROM attempts WHERE ip_hash=?',[$ip]);
        if(($attempt['count']??0)>=10){db()->exec('COMMIT');fail('Muitas tentativas. Aguarde 15 minutos.',429);}
        sql('INSERT INTO attempts(ip_hash,window_start,count) VALUES(?,?,1) ON CONFLICT(ip_hash) DO UPDATE SET count=count+1',[$ip,$now]);db()->exec('COMMIT');
        $u=one('SELECT * FROM admin LIMIT 1');$password=$b['password']??'';
        if(!is_string($password)||strlen($password)>1024||!$u||!password_verify($password,$u['password_hash']))fail('Senha incorreta. Confira e tente novamente.',401);
        sql('DELETE FROM attempts WHERE ip_hash=?',[$ip]);sql('DELETE FROM sessions WHERE expires<?',[$now]);
        $token=bin2hex(random_bytes(32));$csrf=bin2hex(random_bytes(32));$expiry=$now+30*86400;
        sql('INSERT INTO sessions VALUES(?,?,?,?)',[hash('sha256',$token),$u['id'],$csrf,$expiry]);cookie($token,$expiry);
        respond(['authenticated'=>true,'csrf'=>$csrf,'email'=>$u['email']]);
    }
    if($route==='auth/logout'&&$method==='POST'){$u=admin(true);sql('DELETE FROM sessions WHERE token_hash=?',[$u['token_hash']]);cookie('',time()-3600);respond(['ok'=>true]);}
    if($route==='backup'&&$method==='GET'){
        admin();backup_before_write();
        $v=rows('SELECT * FROM veiculos');$f=rows('SELECT * FROM fotos_veiculo');
        header('Content-Disposition: attachment; filename="catalogo-crediti-'.gmdate('Y-m-d').'.json"');respond(['exported_at'=>gmdate('c'),'veiculos'=>$v,'fotos_veiculo'=>$f]);
    }
    if($route==='instagram'){require __DIR__.'/instagram.php';instagram($method);}
    if($route==='share-image'&&$method==='GET'){
        $name=media_name($_GET['src']??'');$path=media_path($name);if(!is_file($path))fail('Imagem não encontrada.',404);
        $type=(getimagesize($path)['mime']??'');if(!str_starts_with($type,'image/'))fail('Imagem inválida.',404);
        header('Content-Type: '.$type);header('Content-Length: '.filesize($path));readfile($path);exit;
    }
    if(str_starts_with($route,'storage/v1/object/public/fotos/')&&$method==='GET'){
        $name=substr($route,strlen('storage/v1/object/public/fotos/'));$path=media_path($name);if(!is_file($path))fail('Imagem não encontrada.',404);
        header('Location: /media/'.str_replace('%2F','/',rawurlencode($name)),true,302);exit;
    }
    if(str_starts_with($route,'storage/v1/object/fotos/')&&$method==='POST'){
        admin(true);$name=substr($route,strlen('storage/v1/object/fotos/'));$path=media_path($name);$id=explode('/',$name)[0];
        if(!one('SELECT id FROM veiculos WHERE id=? AND deleted_at IS NULL',[$id]))fail('Veículo não encontrado.',404);
        if((int)($_SERVER['CONTENT_LENGTH']??0)>13*1024*1024)fail('Foto maior que 12 MB.',413);
        if(is_file($path))fail('Arquivo já existe.',409);
        $files=array_values($_FILES);$tmp=$files[0]['tmp_name']??null;
        if($tmp){if(($files[0]['error']??UPLOAD_ERR_OK)!==UPLOAD_ERR_OK)fail('Falha no envio da foto.');$bytes=file_get_contents($tmp);}else{$bytes=file_get_contents('php://input');}
        if(strlen($bytes)>12*1024*1024)fail('Foto maior que 12 MB.',413);
        $info=@getimagesizefromstring($bytes);if(!$info||!in_array($info['mime'],['image/jpeg','image/png','image/webp'],true)||$info[0]*$info[1]>25000000)fail('Formato de foto inválido.');
        $im=@imagecreatefromstring($bytes);if(!$im)fail('Foto inválida.');
        backup_before_write();if(!is_dir(dirname($path)))mkdir(dirname($path),0755,true);
        if(!imagejpeg($im,$path,92))fail('Não foi possível guardar a foto.',500);imagedestroy($im);chmod($path,0644);
        respond(['Key'=>'fotos/'.$name,'Id'=>uuid()],200);
    }
    if(preg_match('~^rest/v1/(veiculos|fotos_veiculo)$~',$route,$match)){
        $table=$match[1];$isVehicle=$table==='veiculos';$fields=$isVehicle?VEHICLE_FIELDS:['id','veiculo_id','url_foto','criado_em','ordem'];
        $u=session_user();$where=[];$params=[];
        if($isVehicle)$where[]='deleted_at IS NULL';else $where[]='veiculo_id IN (SELECT id FROM veiculos WHERE deleted_at IS NULL)';
        foreach(['id','veiculo_id'] as $filter)if(isset($_GET[$filter])){
            if(!in_array($filter,$fields,true)||!str_starts_with($_GET[$filter],'eq.'))fail('Filtro inválido.');
            $id=substr($_GET[$filter],3);if(!valid_id($id))fail('Identificador inválido.');$where[]=$filter.'=?';$params[]=$id;
        }
        $condition=' WHERE '.implode(' AND ',$where);
        if($method==='GET'){
            $sort=$isVehicle?'criado_em DESC':'ordem ASC';$data=rows('SELECT * FROM '.$table.$condition.' ORDER BY '.$sort,$params);
            $select=$_GET['select']??'*';$nested=$isVehicle&&str_contains($select,'fotos_veiculo');
            $selectFlat=preg_replace('/fotos_veiculo\([^)]*\)/','',$select);
            $requested=array_filter(array_map('trim',explode(',',$selectFlat)));
            $allowed=$isVehicle&&!$u?PUBLIC_FIELDS:$fields;
            $include=in_array('*',$requested,true)?$allowed:array_values(array_intersect($allowed,$requested));
            foreach($data as &$r){$id=$r['id'];$r=array_intersect_key($r,array_flip($include));if($nested)$r['fotos_veiculo']=rows('SELECT id,url_foto,ordem FROM fotos_veiculo WHERE veiculo_id=? ORDER BY ordem,id',[$id]);}unset($r);
            if(str_contains($_SERVER['HTTP_ACCEPT']??'','application/vnd.pgrst.object+json')){if(count($data)!==1)fail('Registro não encontrado.',406);respond($data[0]);}respond($data);
        }
        $u=admin(true);backup_before_write();$data=[];
        if($method==='DELETE'){
            if(!isset($_GET['id']))fail('Identificador obrigatório.');$id=substr($_GET['id'],3);
            if($isVehicle)sql('UPDATE veiculos SET deleted_at=?'.$condition,array_merge([gmdate('c')],$params));else sql('DELETE FROM fotos_veiculo'.$condition,$params);
            audit('delete:'.$table,$id);respond([],200);
        }
        if(!in_array($method,['POST','PATCH'],true))fail('Método não permitido.',405);
        $input=body();if($method==='PATCH'&&!isset($_GET['id']))fail('Identificador obrigatório.');
        $items=$method==='POST'?(array_is_list($input)?$input:[$input]):[$input];
        if(count($items)>5||!count($items))fail('Quantidade inválida.');
        db()->exec('BEGIN IMMEDIATE');
        try {
            foreach($items as $item){
                unset($name);
                if(!is_array($item))fail('Dados inválidos.');
                $item=array_intersect_key($item,array_flip(array_diff($fields,['id','criado_em'])));
                foreach($item as $key=>$value){
                    if(is_array($value)||is_object($value)||is_bool($value))throw new InvalidArgumentException('Valor inválido.');
                    if(is_string($value)&&strlen($value)>10000)throw new InvalidArgumentException('Texto muito longo.');
                    if(in_array($key,['ano_fabricacao','ano_modelo','quilometragem','nosso_valor','valor_lojista','valor_fipe','valor_vendedor','ordem'],true)&&$value!==null){if(!is_numeric($value)||$value<0||$value>999999999)throw new InvalidArgumentException('Número inválido.');$item[$key]=in_array($key,['ano_fabricacao','ano_modelo','quilometragem','ordem'],true)?(int)$value:(float)$value;}
                }
                if(isset($item['placa'])){$item['placa']=strtoupper(trim($item['placa']));if($item['placa']==='')$item['placa']=null;elseif(!preg_match('/^[A-Z0-9]{7}$/',$item['placa']))throw new InvalidArgumentException('Placa inválida.');}
                if(!$isVehicle){
                    if(isset($item['url_foto'])){$name=media_name($item['url_foto']);if(!is_file(media_path($name)))throw new InvalidArgumentException('Foto não enviada.');$item['url_foto']='/media/'.$name;}
                    if(isset($item['veiculo_id'])&&(!valid_id($item['veiculo_id'])||!one('SELECT id FROM veiculos WHERE id=? AND deleted_at IS NULL',[$item['veiculo_id']])))throw new InvalidArgumentException('Veículo inválido.');
                    if(isset($item['veiculo_id'],$name)&&!str_starts_with($name,$item['veiculo_id'].'/'))throw new InvalidArgumentException('Foto de outro veículo.');
                    if(isset($item['ordem'])&&($item['ordem']<1||$item['ordem']>5))throw new InvalidArgumentException('Ordem inválida.');
                }
                if($method==='POST'){
                    if(!$isVehicle&&(!isset($item['veiculo_id'],$item['url_foto'])||(int)one('SELECT count(*) AS n FROM fotos_veiculo WHERE veiculo_id=?',[$item['veiculo_id']])['n']>=5))throw new InvalidArgumentException('Limite de cinco fotos por veículo.');
                    $item['id']=uuid();$item['criado_em']=gmdate('Y-m-d\TH:i:s');$id=$item['id'];
                    sql('INSERT INTO '.$table.' ('.implode(',',array_keys($item)).') VALUES('.implode(',',array_fill(0,count($item),'?')).')',array_values($item));
                }else{
                    $id=substr($_GET['id'],3);if(!$item)throw new InvalidArgumentException('Nenhum dado informado.');
                    if(!$isVehicle&&isset($item['veiculo_id']))throw new InvalidArgumentException('Não é permitido mover a foto para outro veículo.');
                    if(!$isVehicle&&isset($name)){$old=one('SELECT veiculo_id FROM fotos_veiculo WHERE id=?',[$id]);if(!$old||!str_starts_with($name,$old['veiculo_id'].'/'))throw new InvalidArgumentException('Foto de outro veículo.');}
                    sql('UPDATE '.$table.' SET '.implode(',',array_map(fn($k)=>$k.'=?',array_keys($item))).$condition,array_merge(array_values($item),$params));
                    if(!db()->changes())throw new InvalidArgumentException('Registro não encontrado.');
                }
                $r=one('SELECT * FROM '.$table.' WHERE id=?',[$id]);unset($r['deleted_at']);$data[]=$r;audit(strtolower($method).':'.$table,$id);
            }
            db()->exec('COMMIT');
        }catch(Throwable $e){db()->exec('ROLLBACK');if(str_contains($e->getMessage(),'UNIQUE constraint'))fail('Essa placa já está cadastrada.',409,'23505');if($e instanceof InvalidArgumentException)fail($e->getMessage());throw $e;}
        if(str_contains($_SERVER['HTTP_ACCEPT']??'','application/vnd.pgrst.object+json'))respond($data[0],$method==='POST'?201:200);respond($data,$method==='POST'?201:200);
    }
    fail('Rota não encontrada.',404);
}catch(Throwable $e){error_log('Catalogo: '.get_class($e).': '.$e->getMessage());fail('Não foi possível concluir. Tente novamente em instantes.',500);}
