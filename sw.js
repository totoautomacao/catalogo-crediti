const CORE='catalogo-crediti-v25';
const PHOTOS='crediti-fotos-v2';
const VENDOR='crediti-vendor-v1';
const API='crediti-api-v1';
const CORE_FILES=['/','/index.html','/radio-crediti.js','/manifest.webmanifest','/manifest-cliente.webmanifest','/icon-crediti-192-v20.png','/icon-crediti-512-v20.png','/apple-touch-icon-crediti-v20.png','/apple-touch-icon.png','/bank-itau.png','/bank-bradesco.png','/bank-santander.png','/bank-bv.png','/bank-pan.png','/omni-logo-crediti.png','/bank-safra.png','/bank-volkswagen.png','/bank-c6.png','/app.js','/tailwind.css'];
const VENDOR_FILES=[];

async function cacheExternal(cacheName,url){
  try{
    const c=await caches.open(cacheName);
    if(await c.match(url))return;
    const r=await fetch(new Request(url,{mode:'no-cors',cache:'reload'}));
    if(r)await c.put(url,r.clone());
  }catch(_){}
}

async function staleWhileRevalidate(req,cacheName){
  const c=await caches.open(cacheName);
  const hit=await c.match(req);
  const net=fetch(req).then(async r=>{
    if(r&&(r.ok||r.type==='opaque'))await c.put(req,r.clone());
    return r;
  }).catch(()=>null);
  if(hit){net.catch(()=>{});return hit}
  return (await net)||Response.error();
}

async function networkFirst(req,cacheName){
  const c=await caches.open(cacheName);
  try{
    const fresh=await fetch(req,{cache:'no-store'});
    if(fresh&&fresh.ok)await c.put(req,fresh.clone());
    return fresh;
  }catch(_){
    return (await c.match(req))||Response.error();
  }
}

self.addEventListener('install',event=>event.waitUntil((async()=>{
  try{
    const c=await caches.open(CORE);
    await c.addAll(CORE_FILES);
  }catch(_){}
  await Promise.allSettled(VENDOR_FILES.map(u=>cacheExternal(VENDOR,u)));
  await self.skipWaiting();
})()));

self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>
    (k.startsWith('catalogo-crediti-v')&&k!==CORE)||
    k.startsWith('crediti-radio-offline-v')||
    (k.startsWith('crediti-vendor-v')&&k!==VENDOR)||
    (k.startsWith('crediti-fotos-v')&&k!==PHOTOS)||
    (k.startsWith('crediti-api-v')&&k!==API)
  ).map(k=>caches.delete(k)));
  await self.clients.claim();
})()));

self.addEventListener('message',event=>{
  if(event.data?.type==='CACHE_VEHICLE_IMAGES'&&Array.isArray(event.data.urls)){
    const urls=[...new Set(event.data.urls)];
    event.waitUntil(Promise.allSettled(urls.map(u=>cacheExternal(PHOTOS,u))));
  }
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);

  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const fresh=await fetch(req,{cache:'no-store'});
        if(fresh&&fresh.ok){
          const c=await caches.open(CORE);
          c.put('/index.html',fresh.clone()).catch(()=>{});
          c.put('/',fresh.clone()).catch(()=>{});
          return fresh;
        }
      }catch(_){}
      return (await caches.match('/index.html'))||(await caches.match('/'))||Response.error();
    })());
    return;
  }

  // O stream ao vivo do iPhone não pode ser colocado em cache nem bufferizado pelo service worker.
  if(url.origin===self.location.origin&&url.pathname==='/api/radio'){
    return;
  }

  if(url.origin===self.location.origin&&url.pathname==='/radio-crediti.js'){
    event.respondWith(networkFirst(req,CORE));
    return;
  }

  if(url.origin===self.location.origin){
    event.respondWith(staleWhileRevalidate(req,CORE));
    return;
  }

  if(url.hostname==='jfguumxlxmveuszddyky.supabase.co'&&url.pathname.includes('/storage/v1/object/')){
    event.respondWith(staleWhileRevalidate(req,PHOTOS));
    return;
  }

  if(['cdn.tailwindcss.com','unpkg.com','cdn.jsdelivr.net','fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname)){
    event.respondWith(staleWhileRevalidate(req,VENDOR));
    return;
  }

  if(url.hostname==='parallelum.com.br'){
    event.respondWith(staleWhileRevalidate(req,API));
    return;
  }

  // Streams externos de rádio ao vivo usam a internet diretamente.
});
