<?php
declare(strict_types=1);
ini_set('display_errors', '0');
const PUBLIC_ORIGIN = 'https://catalogo.creditisolucoes.com.br';
const PROFILE = 'crediti.oficial';
const COOKIE_NAME = 'crediti_catalogo_admin';
const VEHICLE_FIELDS = ['id','categoria','placa','marca','modelo','versao','ano_fabricacao','ano_modelo','quilometragem','valor_fipe','valor_vendedor','nosso_valor','criado_em','valor_lojista','descricao','fipe_marca_codigo','fipe_modelo_codigo','fipe_ano_codigo'];
const PUBLIC_FIELDS = ['id','categoria','marca','modelo','versao','ano_fabricacao','ano_modelo','quilometragem','nosso_valor','criado_em','descricao'];
function data_dir(): string {
    $dir = getenv('CREDITI_DATA_DIR') ?: dirname(__DIR__, 2).'/.catalogo-data';
    if (!is_dir($dir) && !mkdir($dir,0700,true)) throw new RuntimeException('data directory');
    return $dir;
}
function db(): SQLite3 {
    static $db;
    if ($db) return $db;
    $dir=data_dir(); $file=$dir.'/catalogo.sqlite';
    if (!is_file($file)) {
        $lock=fopen($dir.'/install.lock','c'); if (!$lock||!flock($lock,LOCK_EX)) throw new RuntimeException('install lock');
        if (!is_file($file)) {
            $seed=__DIR__.'/seed.php';
            if (!is_file($seed)) throw new RuntimeException('seed missing');
            $bytes=file_get_contents($seed); $marker="__halt_compiler();\n"; $at=strpos($bytes,$marker);
            if ($at===false) throw new RuntimeException('invalid seed');
            $bytes=substr($bytes,$at+strlen($marker));
            if (!str_starts_with($bytes,"SQLite format 3\0")) throw new RuntimeException('invalid database');
            file_put_contents($file.'.tmp',$bytes,LOCK_EX); chmod($file.'.tmp',0600); rename($file.'.tmp',$file);
        }
        flock($lock,LOCK_UN); fclose($lock);
    }
    $db=new SQLite3($file,SQLITE3_OPEN_READWRITE);$db->enableExceptions(true);$db->busyTimeout(5000);
    $db->exec('PRAGMA foreign_keys=ON');$db->exec('PRAGMA journal_mode=WAL');$db->exec('PRAGMA synchronous=FULL');
    return $db;
}
function sql(string $query,array $params=[]): SQLite3Result {
    $s=db()->prepare($query);
    foreach(array_values($params) as $i=>$v) $s->bindValue($i+1,$v,$v===null?SQLITE3_NULL:(is_int($v)?SQLITE3_INTEGER:(is_float($v)?SQLITE3_FLOAT:SQLITE3_TEXT)));
    return $s->execute();
}
function rows(string $q,array $p=[]): array {$r=sql($q,$p);$a=[];while($v=$r->fetchArray(SQLITE3_ASSOC))$a[]=$v;return $a;}
function one(string $q,array $p=[]): ?array {return rows($q,$p)[0]??null;}
function respond(mixed $v,int $status=200): never {http_response_code($status);header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');echo json_encode($v,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);exit;}
function fail(string $msg,int $status=400,string $code=''): never {respond(['message'=>$msg,'error'=>$msg,'code'=>$code],$status);}
function body(): array {
    if ((int)($_SERVER['CONTENT_LENGTH']??0)>1048576) fail('Pedido muito grande.',413);
    try {$v=json_decode(file_get_contents('php://input'),true,64,JSON_THROW_ON_ERROR);}catch(Throwable){fail('Pedido inválido.');}
    if(!is_array($v))fail('Pedido inválido.'); return $v;
}
function request_origin(): string {
    $host=$_SERVER['HTTP_HOST']??'';
    $allowed=['catalogo.creditisolucoes.com.br','catalogo-teste.creditisolucoes.com.br','creditisolucoes.com.br'];
    if(getenv('CREDITI_TEST_MODE')==='1')$allowed[]='127.0.0.1:8097';
    if(!in_array($host,$allowed,true))fail('Endereço não autorizado.',403);
    if($host==='creditisolucoes.com.br')return PUBLIC_ORIGIN;
    return (getenv('CREDITI_TEST_MODE')==='1'?'http':'https').'://'.$host;
}
function same_origin(): void {
    $o=$_SERVER['HTTP_ORIGIN']??'';
    // The former Cloudflare domain proxies here only while DNS caches expire.
    if(!in_array($o,[request_origin(),PUBLIC_ORIGIN],true))fail('Origem não autorizada.',403);
}
function session_user(): ?array {
    $t=$_COOKIE[COOKIE_NAME]??''; if(!preg_match('/^[a-f0-9]{64}$/',$t))return null;
    return one('SELECT s.*,a.email FROM sessions s JOIN admin a ON a.id=s.admin_id WHERE token_hash=? AND expires>?',[hash('sha256',$t),time()]);
}
function admin(bool $write=false): array {
    $u=session_user();if(!$u)fail('Entre novamente no administrador.',401);
    if($write){same_origin();if(!hash_equals($u['csrf'],$_SERVER['HTTP_X_CREDITI_CSRF']??''))fail('Sessão inválida. Atualize a página.',403);}
    return $u;
}
function cookie(string $value,int $expires): void {setcookie(COOKIE_NAME,$value,['expires'=>$expires,'path'=>'/','secure'=>getenv('CREDITI_TEST_MODE')!=='1','httponly'=>true,'samesite'=>'Lax']);}
function uuid(): string {$b=random_bytes(16);$b[6]=chr((ord($b[6])&15)|64);$b[8]=chr((ord($b[8])&63)|128);$h=bin2hex($b);return substr($h,0,8).'-'.substr($h,8,4).'-'.substr($h,12,4).'-'.substr($h,16,4).'-'.substr($h,20);}
function valid_id(string $id): bool {return preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i',$id)===1;}
function audit(string $action,string $id): void {sql('INSERT INTO audit(created_at,actor,action,entity_id) VALUES(?,?,?,?)',[gmdate('c'),session_user()['admin_id']??'system',$action,$id]);}
function backup_before_write(): void {
    $d=data_dir().'/backups';if(!is_dir($d))mkdir($d,0700,true);
    $file=$d.'/catalogo-'.gmdate('Y-m-d-H').'.sqlite';
    if(is_file($file))return;
    $lock=fopen($d.'/backup.lock','c'); if(!$lock||!flock($lock,LOCK_EX))throw new RuntimeException('backup lock');
    if(!is_file($file)){$copy=new SQLite3($file.'.tmp');if(!db()->backup($copy))throw new RuntimeException('backup failed');$copy->close();chmod($file.'.tmp',0600);rename($file.'.tmp',$file);}
    flock($lock,LOCK_UN);fclose($lock);
    $files=glob($d.'/catalogo-*.sqlite');rsort($files);foreach(array_slice($files,168) as $old)unlink($old);
}
function media_path(string $name): string {
    if(!preg_match('~^[a-f0-9-]{36}/[a-zA-Z0-9_.-]+\.(?:jpg|jpeg|png|webp|gif)$~i',$name)||str_contains($name,'..'))fail('Imagem inválida.');
    return __DIR__.'/media/'.$name;
}
function media_name(string $url): string {
    $p=parse_url($url);$origin=request_origin();
    if(isset($p['host'])&&!in_array($p['host'],['catalogo.creditisolucoes.com.br','catalogo-teste.creditisolucoes.com.br','127.0.0.1'],true))fail('Imagem de outro endereço.');
    $path=rawurldecode($p['path']??'');
    foreach(['/media/','/backend/storage/v1/object/public/fotos/'] as $prefix)if(str_starts_with($path,$prefix)){ $name=substr($path,strlen($prefix));media_path($name);return $name;}
    fail('Imagem inválida.');
}
