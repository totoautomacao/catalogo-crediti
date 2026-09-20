const CORE='catalogo-crediti-v11';
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
