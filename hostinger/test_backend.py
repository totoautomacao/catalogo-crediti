"""Integration checks against a disposable local database, never production."""
import pathlib, os, tempfile, subprocess, sqlite3, json, time, shutil, uuid
import requests
ROOT=pathlib.Path(__file__).resolve().parents[1]
SCRATCH=ROOT.parent
PHP=SCRATCH/'php-runtime/root/usr/bin/php8.4'
env=dict(os.environ,LD_LIBRARY_PATH=str(SCRATCH/'php-runtime/root/usr/lib/x86_64-linux-gnu'),CREDITI_TEST_MODE='1')
cmd=[str(PHP),'-n','-d','extension_dir='+str(SCRATCH/'php-runtime/root/usr/lib/php/20240924'),'-d','extension=sqlite3','-d','extension=curl','-d','extension=gd']
for p in (ROOT/'hostinger').glob('*.php'):subprocess.run(cmd+['-l',str(p)],env=env,check=True,capture_output=True)
with tempfile.TemporaryDirectory(prefix='catalogo-test-') as td:
 td=pathlib.Path(td);app=td/'app';app.mkdir();data=td/'data';data.mkdir();env['CREDITI_DATA_DIR']=str(data)
 for n in ['runtime.php','api.php','instagram.php']:shutil.copy(ROOT/'hostinger'/n,app/n)
 db=sqlite3.connect(data/'catalogo.sqlite');db.executescript((ROOT/'hostinger/schema.sql').read_text())
 password=uuid.uuid4().hex;hashed=subprocess.check_output(cmd+['-r','echo password_hash($argv[1],PASSWORD_BCRYPT);',password],env=env).decode()
 db.execute('INSERT INTO admin VALUES(?,?,?)',(str(uuid.uuid4()),'test@example.invalid',hashed));db.commit();db.close()
 router=td/'router.php';router.write_text("<?php $p=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH); if(str_starts_with($p,'/backend/')){$_GET['route']=substr($p,9);require __DIR__.'/app/api.php';return true;}return false;")
 log=open(td/'server.log','w');server=subprocess.Popen(cmd+['-S','127.0.0.1:8097','-t',str(app),str(router)],env=env,stdout=log,stderr=log)
 try:
  base='http://127.0.0.1:8097';s=requests.Session();s.headers['Origin']=base
  for i in range(30):
   try:r=s.get(base+'/backend/health',timeout=1);break
   except requests.ConnectionError:time.sleep(.1)
  assert r.status_code==200,r.text
  def req(method,path,expected=200,**kw):
   r=s.request(method,base+'/backend/'+path,timeout=10,**kw);assert r.status_code==expected,(method,path,r.status_code,r.text);return r
  req('POST','rest/v1/veiculos',401,json={'marca':'Teste'})
  req('POST','auth/login',403,json={'password':password},headers={'Origin':'https://wrong.invalid'})
  req('POST','auth/login',401,json={'password':'wrong'})
  r=req('POST','auth/login',json={'password':password});s.headers['X-Crediti-CSRF']=r.json()['csrf']
  assert 'HttpOnly' in r.headers['Set-Cookie'] and 'SameSite=Lax' in r.headers['Set-Cookie']
  assert req('GET','auth/session').json()['authenticated']
  obj={'marca':'Teste','modelo':'Migração','placa':'TST1234','valor_lojista':12345.67,'nosso_valor':23456.78,'descricao':'Acentos: ação e coração','ano_modelo':2025}
  v=req('POST','rest/v1/veiculos?select=*',201,json=[obj],headers={'Accept':'application/vnd.pgrst.object+json'}).json();vid=v['id'];assert v['valor_lojista']==12345.67
  req('POST','rest/v1/veiculos',409,json=[obj])
  r=requests.get(base+'/backend/rest/v1/veiculos?select=*,fotos_veiculo(id,url_foto,ordem)').json();assert len(r)==1 and 'valor_lojista' not in r[0] and 'placa' not in r[0]
  req('PATCH','rest/v1/veiculos?id=eq.'+vid,403,json={'modelo':'x'},headers={'X-Crediti-CSRF':'bad'})
  req('PATCH','rest/v1/veiculos?id=eq.'+vid,json={'modelo':'Atualizado'})
  from PIL import Image
  import io
  buff=io.BytesIO();Image.new('RGB',(50,50),'yellow').save(buff,format='JPEG');image=buff.getvalue()
  photo_path=vid+'/test.jpg'
  req('POST','storage/v1/object/fotos/'+photo_path,files={'file':('test.jpg',image,'image/jpeg')})
  p=req('POST','rest/v1/fotos_veiculo',201,json=[{'veiculo_id':vid,'url_foto':base+'/backend/storage/v1/object/public/fotos/'+photo_path,'ordem':1}]).json()[0]
  req('PATCH','rest/v1/fotos_veiculo?id=eq.'+p['id'],json={'ordem':2})
  assert req('GET','rest/v1/veiculos?select=*,fotos_veiculo(id,url_foto,ordem)').json()[0]['fotos_veiculo'][0]['ordem']==2
  req('POST','storage/v1/object/fotos/'+vid+'/bad.php',400,data=b'<?php echo 1;')
  req('POST','storage/v1/object/fotos/'+vid+'/bad.jpg',400,data=b'<?php echo 1;')
  req('GET','share-image',params={'src':'https://evil.invalid/a.jpg'},expected=400)
  assert req('GET','share-image',params={'src':'/media/'+photo_path}).headers['Content-Type']=='image/jpeg'
  req('GET','instagram?action=health');req('POST','instagram?action=publish',503,json={})
  v2=req('POST','rest/v1/veiculos',201,json={'modelo':'Outro'}).json()[0]
  req('POST','rest/v1/fotos_veiculo',400,json=[{'veiculo_id':v2['id'],'url_foto':'/media/'+photo_path,'ordem':1}])
  req('DELETE','rest/v1/fotos_veiculo?id=eq.'+p['id'])
  req('DELETE','rest/v1/veiculos?id=eq.'+vid)
  assert len(req('GET','rest/v1/veiculos').json())==1
  req('POST','rest/v1/veiculos',201,json=[obj])
  export=req('GET','backup').json();assert len(export['veiculos'])==3 and 'admin' not in export
  assert list((data/'backups').glob('*.sqlite'))
  req('POST','auth/logout',json={});assert not req('GET','auth/session').json()['authenticated']
  req('POST','rest/v1/veiculos',401,json={})
  print('PASS: PHP syntax, login/password, cookie, CSRF, public field filtering, CRUD, duplicate plate, photo upload/reorder/ownership, invalid file, soft delete, backups, logout, Instagram unconfigured guard')
 finally:
  server.terminate();server.wait(timeout=5);log.close()
