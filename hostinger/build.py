"""Build the standalone Hostinger release. Seed and photos stay outside Git."""
import pathlib,shutil,re,json,sqlite3,sys,hashlib
ROOT=pathlib.Path(__file__).resolve().parent.parent
BACKUP=pathlib.Path(sys.argv[1]).resolve();OUT=pathlib.Path(sys.argv[2]).resolve()
OUT.mkdir(parents=True,exist_ok=True)
for p in ROOT.iterdir():
 if p.is_file() and p.suffix in ['.js','.css','.html','.png','.jpg','.svg','.webmanifest'] and p.name not in ['_worker.js']:
  shutil.copy2(p,OUT/p.name)
if (ROOT/'offline-audio').exists():shutil.copytree(ROOT/'offline-audio',OUT/'offline-audio',dirs_exist_ok=True)
for name in ['api.php','runtime.php','instagram.php','admin-auth.js','sw.js','.htaccess']:
 shutil.copy2(ROOT/'hostinger'/name,OUT/name)
for name in ['app.js','share-client.js','vehicle-gallery.js']:
 p=OUT/name;s=p.read_text();old='https://jfguumxlxmveuszddyky.supabase.co'
 s=s.replace('"'+old+'"','(location.origin+"/backend")').replace("'"+old+"'","(location.origin+'/backend')")
 p.write_text(s)
p=OUT/'app.js';p.write_text(p.read_text().replace('crediti-catalogo-offline-v2','crediti-catalogo-hostinger-v42'))
p=OUT/'radio-crediti.js';p.write_text(p.read_text().replace("||location.hostname==='catalogo.creditisolucoes.com.br'||location.hostname==='catalogo-crediti-cliente.pages.dev'",''))
p=OUT/'vehicle-gallery.js';p.write_text(p.read_text().replace("(a.textContent||'').match(/(\\d+)\\s+fotos?/i)","[...a.querySelectorAll('span')].map(s=>s.textContent.trim()).join(' ').match(/(?:^|\\s)([1-5])\\s+fotos?(?:$|\\s)/i)"))
p=OUT/'instagram-client.js';s=p.read_text().replace('https://jfguumxlxmveuszddyky.supabase.co/functions/v1/catalogo-instagram','/backend/instagram');s=s.replace('async function api(action,body){',"async function api(action,body){if(action.startsWith('action=job'))body={};");p.write_text(s)
p=OUT/'index.html';s=p.read_text();s=re.sub(r'<link rel="preconnect"[^>]+>','',s)
s=re.sub(r'<script>\(\(\)=>\{const host=location.hostname.*?</script>', '<script>(()=>{const admin=/^/admin/?$/.test(location.pathname);window.__CREDITI_CLIENT_HOST__=!admin;const get=URLSearchParams.prototype.get;URLSearchParams.prototype.get=function(k){return k===\'cliente\'&&window.__CREDITI_CLIENT_HOST__?\'1\':get.call(this,k)}})();</script>'.replace('/^/admin/?$/','/^\\/admin\\/?$/'),s,count=1)
s=re.sub(r'\?v=\d+', '?v=49',s);p.write_text(s)
for name in ['manifest.webmanifest','manifest-cliente.webmanifest']:
 p=OUT/name;d=json.loads(p.read_text());d['start_url']='/admin' if name=='manifest.webmanifest' else '/';d['scope']='/';d['id']=d['start_url'];p.write_text(json.dumps(d,ensure_ascii=False))
data=json.loads((BACKUP/'backup.json').read_text());admin=json.loads((BACKUP/'admin.json').read_text())
seed=BACKUP/'catalogo.sqlite'
if seed.exists():seed.unlink()
db=sqlite3.connect(seed);db.executescript((ROOT/'hostinger/schema.sql').read_text())
for table in ['veiculos','fotos_veiculo']:
 for row in data[table]:
  row=dict(row)
  if table=='fotos_veiculo':row['url_foto']='/media/'+row['url_foto'].split('/storage/v1/object/public/fotos/',1)[1]
  cols=list(row);db.execute(f'INSERT INTO {table} ({",".join(cols)}) VALUES ({",".join("?" for _ in cols)})',[row[k] for k in cols])
for a in admin:db.execute('INSERT INTO admin VALUES(?,?,?)',(a['id'],a['email'],a['encrypted_password']))
db.commit();assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok';db.close()
(OUT/'seed.php').write_bytes(b'<?php http_response_code(404); exit; __halt_compiler();\n'+seed.read_bytes())
shutil.copytree(BACKUP/'media',OUT/'media',dirs_exist_ok=True)
(OUT/'media/.htaccess').write_text('Options -Indexes\n<FilesMatch "\\.(php|phtml|phar|cgi|pl|html|js)$">\nRequire all denied\n</FilesMatch>\n<IfModule mod_headers.c>\nHeader set X-Content-Type-Options "nosniff"\nHeader set Cache-Control "public, max-age=86400"\n</IfModule>\n')
print(json.dumps({'output':str(OUT),'vehicles':len(data['veiculos']),'photos':len(data['fotos_veiculo']),'files':len(list((OUT/'media').rglob('*.*')))}))
