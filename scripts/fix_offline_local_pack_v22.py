from pathlib import Path
import re

p=Path('radio-crediti.js')
s=p.read_text(encoding='utf-8')
playlist="""const OFFLINE_CACHE='crediti-radio-offline-v2';
  const OFFLINE_PLAYLIST=[
    {title:'Duru Roomscene Lo-fi',style:'Lo-fi',url:'/offline-audio/duru-roomscene-lofi.mp3'},
    {title:'Duru Arcade Vibe',style:'Arcade',url:'/offline-audio/duru-arcade-vibe.mp3'},
    {title:'Duru Denparcade',style:'Eletrônica',url:'/offline-audio/duru-denparcade.mp3'},
    {title:'Duru Rhythm Fever',style:'Dance',url:'/offline-audio/duru-rhythm-fever.mp3'},
    {title:'Duru Rondo',style:'Instrumental',url:'/offline-audio/duru-rondo.mp3'},
    {title:'Duru Winter Arcade',style:'Eletrônica',url:'/offline-audio/duru-winter-arcade.mp3'},
    {title:'Duru AI Music',style:'Instrumental',url:'/offline-audio/duru-ai-ep2-music.mp3'},
    {title:'Hyak Rhythm',style:'Ritmo',url:'/offline-audio/hyak-ep1-rhythm.mp3'}
  ];"""
s,n=re.subn(r"const OFFLINE_CACHE='crediti-radio-offline-v1';.*?const OFFLINE_PLAYLIST=\[.*?\];",playlist,s,count=1,flags=re.S)
if not n:
    raise SystemExit('Nao encontrei a playlist antiga')

cached="""async function cachedTracks(){
    if(!('caches'in window))return[];
    try{
      const cache=await caches.open(OFFLINE_CACHE),out=[];
      for(const t of OFFLINE_PLAYLIST){if(await cache.match(t.url))out.push({...t,playUrl:t.url})}
      return out;
    }catch(_){return[]}
  }

  async function cacheOfflinePlaylist(){
    if(cacheStarted||!navigator.onLine||!('caches'in window))return;
    cacheStarted=true;
    try{
      const cache=await caches.open(OFFLINE_CACHE);let done=0;
      for(const t of OFFLINE_PLAYLIST){
        try{
          if(await cache.match(t.url)){done++;continue}
          const r=await fetch(t.url,{cache:'reload'});
          if(r&&r.ok){await cache.put(t.url,r.clone());done++}
        }catch(_){}
        if(expanded&&audio.paused)setStatus(`Offline ${done}/${OFFLINE_PLAYLIST.length} salvo`);
        await sleep(80)
      }
    }catch(_){}
    cacheStarted=false
  }"""
s,n=re.subn(r"async function cachedTracks\(\)\{.*?async function loadOffline",cached+"\n\n  async function loadOffline",s,count=1,flags=re.S)
if not n:
    raise SystemExit('Nao encontrei funcoes de cache offline')
s=s.replace('Playlist grátis CC0','Playlist local CC0')
s=s.replace('Playlist offline ainda não foi salva','Playlist offline ainda está sendo preparada')
s=s.replace('Sem internet • playlist não salva','Sem internet • abra uma vez online para preparar o offline')
s=s.replace('`Offline • ${list.length} músicas salvas`','`Offline pronto • ${list.length} músicas`')
p.write_text(s,encoding='utf-8')

sw=Path('sw.js')
x=sw.read_text(encoding='utf-8')
x=re.sub(r"const CORE='catalogo-crediti-v\d+';","const CORE='catalogo-crediti-v18';",x,count=1)
x=re.sub(r"const MUSIC='crediti-radio-offline-v\d+';","const MUSIC='crediti-radio-offline-v2';",x,count=1)
marker='const VENDOR_FILES=[];'
audio="""const OFFLINE_AUDIO=[
'/offline-audio/duru-roomscene-lofi.mp3',
'/offline-audio/duru-arcade-vibe.mp3',
'/offline-audio/duru-denparcade.mp3',
'/offline-audio/duru-rhythm-fever.mp3',
'/offline-audio/duru-rondo.mp3',
'/offline-audio/duru-winter-arcade.mp3',
'/offline-audio/duru-ai-ep2-music.mp3',
'/offline-audio/hyak-ep1-rhythm.mp3'
];"""
if 'const OFFLINE_AUDIO=' not in x:
    x=x.replace(marker,marker+'\n'+audio,1)
old="self.addEventListener('install',event=>event.waitUntil((async()=>{try{const c=await caches.open(CORE);await c.addAll(CORE_FILES)}catch(_){}await Promise.allSettled(VENDOR_FILES.map(u=>cacheExternal(VENDOR,u)));await self.skipWaiting()})()));"
new="self.addEventListener('install',event=>event.waitUntil((async()=>{try{const c=await caches.open(CORE);await c.addAll(CORE_FILES)}catch(_){}try{const m=await caches.open(MUSIC);await Promise.allSettled(OFFLINE_AUDIO.map(async u=>{try{const r=await fetch(u,{cache:'reload'});if(r&&r.ok)await m.put(u,r.clone())}catch(_){}}))}catch(_){}await Promise.allSettled(VENDOR_FILES.map(u=>cacheExternal(VENDOR,u)));await self.skipWaiting()})()));"
if old not in x:
    raise SystemExit('Install do service worker nao encontrado')
x=x.replace(old,new,1)
needle="if(url.origin===self.location.origin&&url.pathname==='/api/offline-audio'){event.respondWith(serveOfflineAudio(req));return}"
if "url.pathname.startsWith('/offline-audio/')" not in x:
    x=x.replace(needle,"if(url.origin===self.location.origin&&url.pathname.startsWith('/offline-audio/')){event.respondWith(staleWhileRevalidate(req,MUSIC));return}\n "+needle,1)
sw.write_text(x,encoding='utf-8')
