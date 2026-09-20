const CORE='catalogo-crediti-v10';
const MUSIC='crediti-radio-offline-v1';
const CORE_FILES=['/','/index.html','/radio-crediti.js','/manifest.webmanifest','/icon-exact-192-v7.png','/bank-itau.png','/bank-bradesco.png','/bank-santander.png','/bank-bv.png','/bank-pan.png','/omni-logo-crediti.png','/bank-safra.png','/bank-volkswagen.png','/bank-c6.png'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
  try{const c=await caches.open(CORE);await c.addAll(CORE_FILES)}catch(_){}
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k!==CORE&&k!==MUSIC).map(k=>caches.delete(k)));
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(req.destination==='audio'||url.hostname==='en.freepd.cn'){
    event.respondWith((async()=>{
      const cache=await caches.open(MUSIC);
      const hit=await cache.match(req);
      if(hit)return hit;
      try{
        const res=await fetch(req);
        if(res&&(res.ok||res.type==='opaque'))cache.put(req,res.clone()).catch(()=>{});
        return res;
      }catch(e){throw e}
    })());
    return;
  }
  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const res=await fetch(req);
        const c=await caches.open(CORE);
        c.put('/index.html',res.clone()).catch(()=>{});
        return res;
      }catch(_){
        return (await caches.match('/index.html'))||(await caches.match('/'));
      }
    })());
    return;
  }
  if(url.origin===self.location.origin){
    event.respondWith((async()=>{
      const cached=await caches.match(req);
      try{
        const res=await fetch(req);
        if(res&&res.ok){const c=await caches.open(CORE);c.put(req,res.clone()).catch(()=>{})}
        return res;
      }catch(_){return cached||Response.error()}
    })());
  }
});
