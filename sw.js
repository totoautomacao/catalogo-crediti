const CORE='catalogo-crediti-v17';
const MUSIC='crediti-radio-offline-v1';
const PHOTOS='crediti-fotos-v2';
const VENDOR='crediti-vendor-v1';
const API='crediti-api-v1';
const CORE_FILES=['/','/index.html','/radio-crediti.js','/manifest.webmanifest','/manifest-cliente.webmanifest','/icon-crediti-192-v20.png','/icon-crediti-512-v20.png','/apple-touch-icon-crediti-v20.png','/apple-touch-icon.png','/bank-itau.png','/bank-bradesco.png','/bank-santander.png','/bank-bv.png','/bank-pan.png','/omni-logo-crediti.png','/bank-safra.png','/bank-volkswagen.png','/bank-c6.png','/app.js','/tailwind.css'];
const VENDOR_FILES=[];

async function cacheExternal(cacheName,url){try{const c=await caches.open(cacheName);if(await c.match(url))return;const r=await fetch(new Request(url,{mode:'no-cors',cache:'reload'}));if(r)await c.put(url,r.clone())}catch(_){}}
async function staleWhileRevalidate(req,cacheName){const c=await caches.open(cacheName);const hit=await c.match(req);const net=fetch(req).then(async r=>{if(r&&(r.ok||r.type==='opaque'))await c.put(req,r.clone());return r}).catch(()=>null);if(hit){net.catch(()=>{});return hit}return (await net)||Response.error()}

async function serveOfflineAudio(req){
  const cache=await caches.open(MUSIC);
  const key=new Request(req.url,{method:'GET'});
  let full=await cache.match(key);

  if(!full){
    try{
      const net=await fetch(key,{cache:'no-store'});
      if(net&&net.ok){
        if(net.status===200) await cache.put(key,net.clone());
        full=net;
      }
    }catch(_){}
  }
  if(!full) return Response.error();

  const range=req.headers.get('range');
  if(!range || full.status!==200) return full;

  try{
    const buffer=await full.clone().arrayBuffer();
    const size=buffer.byteLength;
    const match=/bytes=(\d*)-(\d*)/.exec(range);
    if(!match) return full;
    let start=match[1]?Number(match[1]):0;
    let end=match[2]?Number(match[2]):size-1;
    if(!match[1]&&match[2]){const suffix=Number(match[2]);start=Math.max(0,size-suffix);end=size-1}
    start=Math.max(0,Math.min(start,size-1));
    end=Math.max(start,Math.min(end,size-1));
    const chunk=buffer.slice(start,end+1);
    const headers=new Headers({
      'Content-Type':full.headers.get('content-type')||'audio/mpeg',
      'Accept-Ranges':'bytes',
      'Content-Range':`bytes ${start}-${end}/${size}`,
      'Content-Length':String(chunk.byteLength),
      'Cache-Control':'public, max-age=31536000, immutable'
    });
    return new Response(chunk,{status:206,headers});
  }catch(_){return full}
}

self.addEventListener('install',event=>event.waitUntil((async()=>{try{const c=await caches.open(CORE);await c.addAll(CORE_FILES)}catch(_){}await Promise.allSettled(VENDOR_FILES.map(u=>cacheExternal(VENDOR,u)));await self.skipWaiting()})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>(k.startsWith('catalogo-crediti-v')&&k!==CORE)||(k.startsWith('crediti-vendor-v')&&k!==VENDOR)||(k.startsWith('crediti-fotos-v')&&k!==PHOTOS)||(k.startsWith('crediti-api-v')&&k!==API)).map(k=>caches.delete(k)));await self.clients.claim()})()));
self.addEventListener('message',event=>{if(event.data?.type==='CACHE_VEHICLE_IMAGES'&&Array.isArray(event.data.urls)){const urls=[...new Set(event.data.urls)];event.waitUntil(Promise.allSettled(urls.map(u=>cacheExternal(PHOTOS,u))))}});
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);
 if(url.origin===self.location.origin&&url.pathname==='/api/offline-audio'){event.respondWith(serveOfflineAudio(req));return}
 if(req.destination==='audio'||url.hostname==='en.freepd.cn'){event.respondWith(staleWhileRevalidate(req,MUSIC));return}
 if(req.mode==='navigate'){
  event.respondWith((async()=>{
   try{
    const fresh=await fetch(req,{cache:'no-store'});
    if(fresh&&fresh.ok){const c=await caches.open(CORE);c.put('/index.html',fresh.clone()).catch(()=>{});c.put('/',fresh.clone()).catch(()=>{});return fresh}
   }catch(_){}
   return (await caches.match('/index.html'))||(await caches.match('/'))||Response.error();
  })());
  return;
 }
 if(url.origin===self.location.origin){event.respondWith(staleWhileRevalidate(req,CORE));return}
 if(url.hostname==='jfguumxlxmveuszddyky.supabase.co'&&url.pathname.includes('/storage/v1/object/')){event.respondWith(staleWhileRevalidate(req,PHOTOS));return}
 if(['cdn.tailwindcss.com','unpkg.com','cdn.jsdelivr.net','fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname)){event.respondWith(staleWhileRevalidate(req,VENDOR));return}
 if(url.hostname==='parallelum.com.br'){event.respondWith(staleWhileRevalidate(req,API));return}
});
