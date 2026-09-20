from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')

helpers=r'''
const CREDITI_OFFLINE_DB='crediti-catalogo-offline-v2';
const CREDITI_OFFLINE_STORE='dados';
const CREDITI_OFFLINE_PUBLICO='veiculos-publicos';
const CREDITI_OFFLINE_INTERNO='veiculos-internos';
function creditAbrirDb(){return new Promise((resolve,reject)=>{try{const r=indexedDB.open(CREDITI_OFFLINE_DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(CREDITI_OFFLINE_STORE))r.result.createObjectStore(CREDITI_OFFLINE_STORE)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)}catch(e){reject(e)}})}
async function creditDbLer(chave){try{const db=await creditAbrirDb();return await new Promise((resolve,reject)=>{const tx=db.transaction(CREDITI_OFFLINE_STORE,'readonly');const req=tx.objectStore(CREDITI_OFFLINE_STORE).get(chave);req.onsuccess=()=>resolve(req.result?.dados||[]);req.onerror=()=>reject(req.error)})}catch{return []}}
async function creditDbSalvar(chave,dados){try{const db=await creditAbrirDb();await new Promise((resolve,reject)=>{const tx=db.transaction(CREDITI_OFFLINE_STORE,'readwrite');tx.objectStore(CREDITI_OFFLINE_STORE).put({dados,atualizadoEm:Date.now()},chave);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})}catch(e){console.warn('Cache offline indisponível:',e)}}
function creditNormalizarLista(data){return (data||[]).map(v=>({...v,fotos_veiculo:[...(v.fotos_veiculo||[])].sort((a,b)=>(a.ordem||99)-(b.ordem||99))}))}
function creditVersaoPublica(v){return {id:v.id,categoria:v.categoria,marca:v.marca,modelo:v.modelo,versao:v.versao,ano_fabricacao:v.ano_fabricacao,ano_modelo:v.ano_modelo,nosso_valor:v.nosso_valor,quilometragem:v.quilometragem,descricao:v.descricao,criado_em:v.criado_em,fotos_veiculo:creditNormalizarLista([{fotos_veiculo:v.fotos_veiculo||[]}])[0].fotos_veiculo}}
async function creditSalvarListasOffline(lista){const normal=creditNormalizarLista(lista);if(CREDITI_MODO_CLIENTE){await creditDbSalvar(CREDITI_OFFLINE_PUBLICO,normal)}else{await Promise.all([creditDbSalvar(CREDITI_OFFLINE_INTERNO,normal),creditDbSalvar(CREDITI_OFFLINE_PUBLICO,normal.map(creditVersaoPublica))])}}
async function creditLerListaOffline(){return creditDbLer(CREDITI_MODO_CLIENTE?CREDITI_OFFLINE_PUBLICO:CREDITI_OFFLINE_INTERNO)}
async function creditCacheFotos(lista){const urls=[...new Set((lista||[]).flatMap(v=>(v.fotos_veiculo||[]).map(f=>f.url_foto).filter(Boolean)))];if(!urls.length)return;try{navigator.storage?.persist?.().catch(()=>{});if(navigator.serviceWorker?.controller){navigator.serviceWorker.controller.postMessage({type:'CACHE_VEHICLE_IMAGES',urls});return}if('caches' in window){const c=await caches.open('crediti-fotos-v2');await Promise.allSettled(urls.map(async u=>{if(await c.match(u))return;const r=await fetch(u,{mode:'no-cors'});if(r)await c.put(u,r.clone())}))}}catch(e){console.warn('Pré-cache das fotos indisponível:',e)}}
'''

if "const CREDITI_OFFLINE_DB='crediti-catalogo-offline-v2';" not in s:
    marker='function App(){'
    if marker not in s:
        raise SystemExit('Marcador function App nao encontrado')
    s=s.replace(marker,helpers+'\n'+marker,1)

old_effect="useEffect(()=>{carregar()},[]);useEffect(()=>{carregarMarcas()},[form.categoria]);"
new_effect="useEffect(()=>{carregar();const aoVoltarInternet=()=>carregar();window.addEventListener('online',aoVoltarInternet);return()=>window.removeEventListener('online',aoVoltarInternet)},[]);useEffect(()=>{carregarMarcas()},[form.categoria]);"
if old_effect in s:
    s=s.replace(old_effect,new_effect,1)
elif new_effect not in s:
    raise SystemExit('useEffect inicial nao encontrado')

start=s.find(' async function carregar(){')
end=s.find(' async function carregarMarcas(){',start)
if start<0 or end<0:
    raise SystemExit('Funcao carregar nao encontrada')
new_carregar=r''' async function carregar(){
  setListaLoading(true);
  const offline=creditNormalizarLista(await creditLerListaOffline());
  if(offline.length){setVeiculos(offline);setListaLoading(false);creditCacheFotos(offline)}
  const campos=CREDITI_MODO_CLIENTE?'id,categoria,marca,modelo,versao,ano_fabricacao,ano_modelo,nosso_valor,quilometragem,descricao,criado_em,fotos_veiculo(id,url_foto,ordem)':'*, fotos_veiculo(id,url_foto,ordem)';
  try{
   const {data,error}=await supabaseClient.from('veiculos').select(campos).order('criado_em',{ascending:false});
   if(error)throw error;
   const lista=creditNormalizarLista(data||[]);
   setVeiculos(lista);setListaLoading(false);
   creditSalvarListasOffline(lista);
   creditCacheFotos(lista);
  }catch(error){
   console.warn('Sem conexão: usando catálogo salvo no aparelho.',error);
   if(!offline.length){setVeiculos([]);setListaLoading(false)}
  }
 }
'''
s=s[:start]+new_carregar+s[end:]
p.write_text(s,encoding='utf-8')

sw=Path('sw.js')
sw.write_text(r'''const CORE='catalogo-crediti-v11';
const MUSIC='crediti-radio-offline-v1';
const PHOTOS='crediti-fotos-v2';
const VENDOR='crediti-vendor-v1';
const API='crediti-api-v1';
const CORE_FILES=['/','/index.html','/radio-crediti.js','/manifest.webmanifest','/icon-exact-192-v7.png','/icon-exact-512-v7.png','/apple-touch-icon-exact-v7.png','/bank-itau.png','/bank-bradesco.png','/bank-santander.png','/bank-bv.png','/bank-pan.png','/omni-logo-crediti.png','/bank-safra.png','/bank-volkswagen.png','/bank-c6.png'];
const VENDOR_FILES=['https://cdn.tailwindcss.com','https://unpkg.com/react@18/umd/react.production.min.js','https://unpkg.com/react-dom@18/umd/react-dom.production.min.js','https://unpkg.com/@babel/standalone/babel.min.js','https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2','https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js'];
async function cacheExternal(cacheName,url){try{const c=await caches.open(cacheName);if(await c.match(url))return;const r=await fetch(new Request(url,{mode:'no-cors',cache:'reload'}));if(r)await c.put(url,r.clone())}catch(_){}}
async function staleWhileRevalidate(req,cacheName){const c=await caches.open(cacheName);const hit=await c.match(req);const net=fetch(req).then(async r=>{if(r&&(r.ok||r.type==='opaque'))await c.put(req,r.clone());return r}).catch(()=>null);if(hit){net.catch(()=>{});return hit}return (await net)||Response.error()}
self.addEventListener('install',event=>event.waitUntil((async()=>{try{const c=await caches.open(CORE);await c.addAll(CORE_FILES)}catch(_){}await Promise.allSettled(VENDOR_FILES.map(u=>cacheExternal(VENDOR,u)));await self.skipWaiting()})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>(k.startsWith('catalogo-crediti-v')&&k!==CORE)||(k.startsWith('crediti-vendor-v')&&k!==VENDOR)||(k.startsWith('crediti-fotos-v')&&k!==PHOTOS)||(k.startsWith('crediti-api-v')&&k!==API)).map(k=>caches.delete(k)));await self.clients.claim()})()));
self.addEventListener('message',event=>{if(event.data?.type==='CACHE_VEHICLE_IMAGES'&&Array.isArray(event.data.urls)){const urls=[...new Set(event.data.urls)].slice(0,300);event.waitUntil(Promise.allSettled(urls.map(u=>cacheExternal(PHOTOS,u))))}});
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);
 if(req.destination==='audio'||url.hostname==='en.freepd.cn'){event.respondWith(staleWhileRevalidate(req,MUSIC));return}
 if(req.mode==='navigate'){
  const update=fetch(req).then(async r=>{if(r&&r.ok){const c=await caches.open(CORE);await c.put('/index.html',r.clone());await c.put('/',r.clone())}return r}).catch(()=>null);
  event.waitUntil(update.then(()=>{}));
  event.respondWith((async()=>{const cached=(await caches.match('/index.html'))||(await caches.match('/'));if(cached)return cached;return (await update)||Response.error()})());return;
 }
 if(url.origin===self.location.origin){event.respondWith(staleWhileRevalidate(req,CORE));return}
 if(url.hostname==='jfguumxlxmveuszddyky.supabase.co'&&url.pathname.includes('/storage/v1/object/')){event.respondWith(staleWhileRevalidate(req,PHOTOS));return}
 if(['cdn.tailwindcss.com','unpkg.com','cdn.jsdelivr.net','fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname)){event.respondWith(staleWhileRevalidate(req,VENDOR));return}
 if(url.hostname==='parallelum.com.br'){event.respondWith(staleWhileRevalidate(req,API));return}
});
''',encoding='utf-8')

print('Offline-first aplicado ao catalogo interno e publico')
