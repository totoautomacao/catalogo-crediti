const VERSION='catalogo-hostinger-v50';
self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith('catalogo-')||k.startsWith('crediti-'))await caches.delete(k);await self.clients.claim()})()));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(u.origin===location.origin&&(u.pathname.startsWith('/backend/')||u.pathname.startsWith('/api/')||e.request.mode==='navigate')){e.respondWith(fetch(e.request,{cache:'no-store'}));}});
