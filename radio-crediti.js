(()=>{
  const qs=new URLSearchParams(location.search);
  if(qs.get('cliente')!=='1' || document.getElementById('crediti-radio-root')) return;

  const API_HOSTS=[
    'https://all.api.radio-browser.info',
    'https://de1.api.radio-browser.info',
    'https://nl1.api.radio-browser.info',
    'https://at1.api.radio-browser.info'
  ];
  const OFFLINE_CACHE='crediti-radio-offline-v1';
  const p=(c,n)=>({title:n,style:c,url:'https://en.freepd.cn/api/music/'+Array.from(new TextEncoder().encode(c+'/'+n+'.mp3')).map(b=>b.toString(16).padStart(2,'0')).join('')});
  const OFFLINE_PLAYLIST=[
    ...['3 am West End','Arpent','Backbeat','Beat One','Beat Thee','Bit Bit Loop','Chronos','Favorite','Fireworks','Goodnightmare','Hear What They Say','Hippety Hop'].map(n=>p('Electronic',n)),
    ...['A Very Brady Special','Amazing Grace','Brothers Unite',"Burt's Requiem",'Champ de tournesol','Horizon Flare','Isolation Waltz','La Citadelle',"Landra's Dream",'Lovely Piano Song','Lucky Break','Night in Venice'].map(n=>p('Romance',n)),
    ...['Advertime','And Just Like That','Bar Brawl','Be Chillin','City Sunshine','From Page to Practice','Funshine','Happy Whistling Ukulele','Inspiration','Inventing Flight','Limit 70','Motions'].map(n=>p('Upbeat',n)),
    ...['Ambient Bongos','Aquatic City Vanished','Bavarian Seascape','Be Jammin','Blacksmith','Blood Eagle','Bollywood Groove','Bonfire','Breaking Bollywood','Connecting Rainbows','Coy Koi','Cumbish'].map(n=>p('World',n)),
    ...['Alls Fair In Love','Vintage Party'].map(n=>p('Comedy',n))
  ];
  const STORAGE_VOL='crediti_radio_volume_v1';
  const STORAGE_MUTE='crediti_radio_mute_v1';
  const DEFAULT_VOL=.22;
  const audio=new Audio();
  audio.preload='none';
  audio.playsInline=true;
  let stations=[];
  let currentIndex=0;
  let offlineIndex=0;
  let preparing=false;
  let prepared=false;
  let expanded=false;
  let sourceMode='live';
  let switching=false;
  let cacheStarted=false;
  let lastVolume=Math.max(.05,Math.min(1,Number(localStorage.getItem(STORAGE_VOL))||DEFAULT_VOL));
  let muted=localStorage.getItem(STORAGE_MUTE)==='1';
  audio.volume=muted?0:lastVolume;

  document.documentElement.style.overflowX='hidden';document.body.style.overflowX='hidden';document.documentElement.style.maxWidth='100%';document.body.style.maxWidth='100%';document.documentElement.style.touchAction='pan-y pinch-zoom';document.body.style.touchAction='pan-y pinch-zoom';document.body.style.paddingBottom='calc(24px + env(safe-area-inset-bottom))';

  const style=document.createElement('style');
  style.textContent=`
    #crediti-radio-root{position:fixed;left:10px;bottom:calc(5px + env(safe-area-inset-bottom));max-width:calc(100vw - 20px);z-index:90;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#111}
    .cr-shell{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.97);backdrop-filter:blur(16px);border:1px solid rgba(0,0,0,.08);box-shadow:0 12px 34px rgba(0,0,0,.14);border-radius:18px;padding:7px;max-width:calc(100vw - 28px);transition:.2s ease}
    .cr-radio-btn,.cr-play,.cr-mute,.cr-close{border:0;outline:0;cursor:pointer;display:flex;align-items:center;justify-content:center}
    .cr-radio-btn{width:42px;height:42px;border-radius:14px;background:#FDCA01;font-size:21px;flex:0 0 auto}
    .cr-play{width:42px;height:42px;border-radius:14px;background:#111;color:#fff;font-size:16px;flex:0 0 auto}
    .cr-copy{display:none;min-width:0;max-width:165px}.cr-shell.is-open .cr-copy{display:block}
    .cr-title{font-size:12px;font-weight:800;white-space:nowrap}.cr-status{font-size:10px;color:rgba(0,0,0,.52);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}
    .cr-controls{display:none;align-items:center;gap:7px;margin-left:2px}.cr-shell.is-open .cr-controls{display:flex}
    .cr-mute{width:32px;height:32px;border-radius:10px;background:#F2F2EE;font-size:14px;flex:0 0 auto}.cr-volume{width:86px;accent-color:#111}.cr-close{width:28px;height:28px;border-radius:9px;background:transparent;color:#777;font-size:18px}
    .cr-bars{display:none;align-items:flex-end;gap:2px;height:15px;margin-left:1px}.cr-shell.is-playing .cr-bars{display:flex}
    .cr-bars i{display:block;width:3px;border-radius:3px;background:#111;animation:crEq .8s ease-in-out infinite alternate}.cr-bars i:nth-child(1){height:6px}.cr-bars i:nth-child(2){height:12px;animation-delay:.14s}.cr-bars i:nth-child(3){height:8px;animation-delay:.28s}
    @keyframes crEq{from{transform:scaleY(.45);opacity:.5}to{transform:scaleY(1);opacity:1}}
    @media(max-width:390px){.cr-volume{width:68px}.cr-copy{max-width:120px}}
  `;
  document.head.appendChild(style);

  const root=document.createElement('div');
  root.id='crediti-radio-root';
  root.innerHTML=`<div class="cr-shell" id="crShell"><button class="cr-radio-btn" id="crExpand" aria-label="Abrir Rádio Crediti">📻</button><button class="cr-play" id="crPlay" aria-label="Tocar rádio">▶</button><div class="cr-copy"><div class="cr-title">Rádio Crediti</div><div class="cr-status" id="crStatus">Programação variada</div></div><div class="cr-bars"><i></i><i></i><i></i></div><div class="cr-controls"><button class="cr-mute" id="crMute" aria-label="Silenciar">🔊</button><input class="cr-volume" id="crVolume" type="range" min="0" max="100" step="1" aria-label="Volume da rádio"/><button class="cr-close" id="crClose" aria-label="Fechar controles">×</button></div></div>`;
  document.body.appendChild(root);

  const shell=document.getElementById('crShell'),btnExpand=document.getElementById('crExpand'),btnPlay=document.getElementById('crPlay'),btnMute=document.getElementById('crMute'),btnClose=document.getElementById('crClose'),volume=document.getElementById('crVolume'),status=document.getElementById('crStatus');
  volume.value=String(Math.round(lastVolume*100));
  const setStatus=t=>status.textContent=t||'Programação variada';
  const setOpen=v=>{expanded=!!v;shell.classList.toggle('is-open',expanded)};
  function syncMute(){btnMute.textContent=audio.volume===0?'🔇':audio.volume<.45?'🔉':'🔊';localStorage.setItem(STORAGE_MUTE,audio.volume===0?'1':'0')}
  function syncPlay(){const playing=!audio.paused&&!audio.ended;shell.classList.toggle('is-playing',playing);btnPlay.textContent=playing?'❚❚':'▶';btnPlay.setAttribute('aria-label',playing?'Pausar rádio':'Tocar rádio')}

  function stationScore(s){const txt=((s.name||'')+' '+(s.tags||'')).toLowerCase(),genres=['sertanejo','forro','forró','pop','rock','romant','mpb','flashback','dance','hits','eclet','eclectic','varied','variad','musica','música'],bad=['news','noticia','notícia','talk','jornal','sports','esporte','podcast'];let score=genres.reduce((n,g)=>n+(txt.includes(g)?1:0),0)*120+Math.log1p(Number(s.votes)||0)*14+Math.min(80,(Number(s.bitrate)||0)/3);if(txt.includes('variety')||txt.includes('variad')||txt.includes('eclet'))score+=220;if(txt.includes('hits')||txt.includes('music')||txt.includes('musica')||txt.includes('música'))score+=70;bad.forEach(k=>{if(txt.includes(k))score-=180});return score}

  async function fetchStations(){if(preparing||!navigator.onLine)return false;preparing=true;if(sourceMode==='live')setStatus('Preparando programação…');const query='/json/stations/search?countrycode=BR&hidebroken=true&is_https=true&order=votes&reverse=true&limit=180';let data=null;for(const host of API_HOSTS){try{const r=await fetch(host+query,{cache:'no-store'});if(!r.ok)continue;const j=await r.json();if(Array.isArray(j)&&j.length){data=j;break}}catch(_){}}if(data){stations=data.filter(s=>{const u=(s.url_resolved||s.url||'').trim(),c=(s.codec||'').toLowerCase();return u.startsWith('https://')&&!/(m3u8|hls)/i.test(u)&&c==='mp3'&&Number(s.bitrate||0)>=128&&Number(s.bitrate||0)<=320}).sort((a,b)=>stationScore(b)-stationScore(a)).slice(0,24);if(stations.length){currentIndex=0;prepared=true;if(sourceMode==='live')loadLive(false)}}preparing=false;return prepared}
  const stationUrl=s=>(s&&(s.url_resolved||s.url)||'').trim();
  function loadLive(autoplay){const s=stations[currentIndex],u=stationUrl(s);if(!u)return;sourceMode='live';switching=true;audio.pause();audio.removeAttribute('src');audio.load();audio.playbackRate=1;audio.defaultPlaybackRate=1;audio.src=u;audio.load();setTimeout(()=>switching=false,420);if('mediaSession'in navigator){try{navigator.mediaSession.metadata=new MediaMetadata({title:'Rádio Crediti',artist:'Programação variada',album:s.name||'Rádio online'})}catch(_){}}if(autoplay)audio.play().catch(()=>setStatus('Toque em Play para ouvir'))}

  async function cachedTracks(){if(!('caches'in window))return[];try{const cache=await caches.open(OFFLINE_CACHE),out=[];for(const t of OFFLINE_PLAYLIST){if(await cache.match(t.url))out.push(t)}return out}catch(_){return[]}}
  async function cacheOfflinePlaylist(){if(cacheStarted||!navigator.onLine||!('caches'in window))return;cacheStarted=true;try{const cache=await caches.open(OFFLINE_CACHE);let done=0;for(const t of OFFLINE_PLAYLIST){try{const existing=await cache.match(t.url);if(existing){done++;continue}const req=new Request(t.url,{mode:'no-cors',credentials:'omit',cache:'no-store'}),res=await fetch(req);if(res&&(res.ok||res.type==='opaque')){await cache.put(req,res.clone());done++}}catch(_){}if(sourceMode==='live'&&audio.paused&&expanded)setStatus(`Offline ${done}/50 preparado`);await new Promise(r=>setTimeout(r,180))}}catch(_){}cacheStarted=false}
  async function loadOffline(autoplay,advance=false){const available=await cachedTracks();if(!available.length){setStatus('Offline ainda não baixado');syncPlay();return false}if(advance)offlineIndex=(offlineIndex+1)%available.length;else offlineIndex=Math.min(offlineIndex,available.length-1);const t=available[offlineIndex];sourceMode='offline';switching=true;audio.pause();audio.removeAttribute('src');audio.load();audio.playbackRate=1;audio.defaultPlaybackRate=1;audio.src=t.url;audio.load();setStatus(`Offline • ${t.title}`);setTimeout(()=>switching=false,420);if('mediaSession'in navigator){try{navigator.mediaSession.metadata=new MediaMetadata({title:t.title,artist:'Rádio Crediti Offline',album:'Playlist grátis CC0'})}catch(_){}}if(autoplay)audio.play().catch(()=>setStatus('Toque em Play para ouvir offline'));return true}
  async function switchToOffline(){const wasPlaying=!audio.paused;await loadOffline(wasPlaying,false);if(!wasPlaying)syncPlay()}
  async function switchToLive(){const wasPlaying=!audio.paused;if(!prepared)await fetchStations();if(prepared)loadLive(wasPlaying)}
  function tryNextLive(){if(!navigator.onLine){switchToOffline();return}if(!stations.length){fetchStations();return}currentIndex=(currentIndex+1)%stations.length;setStatus('Buscando outra programação…');loadLive(!audio.paused)}

  btnExpand.addEventListener('click',()=>setOpen(!expanded));btnClose.addEventListener('click',()=>setOpen(false));
  btnPlay.addEventListener('click',async()=>{setOpen(true);if(!audio.paused){audio.pause();return}if(!navigator.onLine){await loadOffline(true,false);return}const precisaLive=sourceMode!=='live'||!audio.src;if(!prepared)await fetchStations();if(prepared){if(precisaLive)loadLive(false);audio.playbackRate=1;audio.defaultPlaybackRate=1;try{await audio.play()}catch(_){setStatus('Toque novamente em Play para ouvir')}}else{const ok=await loadOffline(true,false);if(!ok)setStatus('Rádio indisponível no momento')}});
  btnMute.addEventListener('click',()=>{if(audio.volume===0){audio.volume=lastVolume;volume.value=String(Math.round(lastVolume*100))}else{lastVolume=audio.volume;audio.volume=0;volume.value='0'}syncMute()});
  volume.addEventListener('input',()=>{const v=Math.max(0,Math.min(1,Number(volume.value)/100));audio.volume=v;if(v>0){lastVolume=v;localStorage.setItem(STORAGE_VOL,String(v))}syncMute()});
  audio.addEventListener('play',()=>{syncPlay();if(sourceMode==='offline'){const t=OFFLINE_PLAYLIST.find(x=>x.url===audio.src);setStatus(`Offline • ${t?.title||'playlist variada'}`)}else setStatus('Tocando • qualidade alta')});
  audio.addEventListener('pause',()=>{syncPlay();if(switching)return;if(sourceMode==='offline')setStatus('Offline pausado • toque para continuar');else if(prepared)setStatus('Pausado • toque para continuar')});
  audio.addEventListener('waiting',()=>setStatus(sourceMode==='offline'?'Abrindo música offline…':'Conectando à rádio…'));
  audio.addEventListener('stalled',()=>{if(switching)return;if(!navigator.onLine)switchToOffline();else setStatus('Reconectando…')});
  audio.addEventListener('error',()=>{if(switching)return;syncPlay();if(!navigator.onLine||sourceMode==='offline')setTimeout(()=>loadOffline(true,true),400);else setTimeout(tryNextLive,700)});
  audio.addEventListener('ended',()=>{if(switching)return;sourceMode==='offline'?loadOffline(true,true):tryNextLive()});
  audio.addEventListener('playing',()=>{if(sourceMode==='live')setStatus('Tocando • qualidade alta')});
  window.addEventListener('offline',()=>switchToOffline());
  window.addEventListener('online',()=>{cacheOfflinePlaylist();if(sourceMode==='offline')switchToLive()});
  if('mediaSession'in navigator){try{navigator.mediaSession.setActionHandler('play',()=>btnPlay.click());navigator.mediaSession.setActionHandler('pause',()=>audio.pause());navigator.mediaSession.setActionHandler('nexttrack',()=>sourceMode==='offline'?loadOffline(true,true):tryNextLive())}catch(_){}}
  syncMute();syncPlay();setOpen(false);
  if(navigator.onLine){fetchStations();setTimeout(cacheOfflinePlaylist,4500)}else{sourceMode='offline';cachedTracks().then(list=>setStatus(list.length?`Offline • ${list.length} músicas salvas`:'Offline ainda não baixado'))}
})();
