(()=>{
  const qs=new URLSearchParams(location.search);
  if(qs.get('cliente')!=='1'||document.getElementById('crediti-radio-root'))return;

  const API_HOSTS=[
    'https://all.api.radio-browser.info',
    'https://de1.api.radio-browser.info',
    'https://nl1.api.radio-browser.info',
    'https://at1.api.radio-browser.info'
  ];
  const OFFLINE_CACHE='crediti-radio-offline-v2';
  const OFFLINE_PLAYLIST=[
    {title:'Duru Roomscene Lo-fi',style:'Lo-fi',url:'/offline-audio/duru-roomscene-lofi.mp3'},
    {title:'Duru Arcade Vibe',style:'Arcade',url:'/offline-audio/duru-arcade-vibe.mp3'},
    {title:'Duru Denparcade',style:'Eletrônica',url:'/offline-audio/duru-denparcade.mp3'},
    {title:'Duru Rhythm Fever',style:'Dance',url:'/offline-audio/duru-rhythm-fever.mp3'},
    {title:'Duru Rondo',style:'Instrumental',url:'/offline-audio/duru-rondo.mp3'},
    {title:'Duru Winter Arcade',style:'Eletrônica',url:'/offline-audio/duru-winter-arcade.mp3'},
    {title:'Duru AI Music',style:'Instrumental',url:'/offline-audio/duru-ai-ep2-music.mp3'},
    {title:'Hyak Rhythm',style:'Ritmo',url:'/offline-audio/hyak-ep1-rhythm.mp3'}
  ];

  const STORAGE_VOL='crediti_radio_volume_v1';
  const STORAGE_MUTE='crediti_radio_mute_v1';
  const DEFAULT_VOL=.22;
  const IS_IOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const audio=new Audio();
  audio.preload='metadata';
  audio.playsInline=true;

  let stations=[],currentIndex=0,offlineIndex=0,preparing=false,prepared=false,expanded=false,sourceMode='live',switching=false,cacheStarted=false,liveFailures=0,liveFallbackTimer=null;
  let lastVolume=Math.max(.05,Math.min(1,Number(localStorage.getItem(STORAGE_VOL))||DEFAULT_VOL));
  let muted=localStorage.getItem(STORAGE_MUTE)==='1';
  audio.volume=IS_IOS?1:(muted?0:lastVolume);audio.muted=!!muted;

  document.documentElement.style.overflowX='hidden';
  document.body.style.overflowX='hidden';
  document.documentElement.style.maxWidth='100%';
  document.body.style.maxWidth='100%';
  document.body.style.paddingBottom='0px';

  const style=document.createElement('style');
  style.textContent=`
    #crediti-radio-root{position:fixed;left:10px;bottom:calc(6px + env(safe-area-inset-bottom));max-width:calc(100vw - 20px);z-index:90;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#111;touch-action:manipulation}
    .cr-shell{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.97);backdrop-filter:blur(16px);border:1px solid rgba(0,0,0,.08);box-shadow:0 12px 34px rgba(0,0,0,.14);border-radius:18px;padding:7px;max-width:calc(100vw - 28px);transition:.2s ease}
    .cr-radio-btn,.cr-play,.cr-mute,.cr-close{border:0;outline:0;cursor:pointer;display:flex;align-items:center;justify-content:center}
    .cr-radio-btn{width:42px;height:42px;border-radius:14px;background:#FDCA01;font-size:21px;flex:0 0 auto}
    .cr-play{width:42px;height:42px;border-radius:14px;background:#111;color:#fff;font-size:16px;flex:0 0 auto}
    .cr-copy{display:none;min-width:0;max-width:165px}.cr-shell.is-open .cr-copy{display:block}
    .cr-title{font-size:12px;font-weight:800;white-space:nowrap}.cr-status{font-size:10px;color:rgba(0,0,0,.52);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}
    .cr-controls{display:none;align-items:center;gap:7px;margin-left:2px}.cr-shell.is-open .cr-controls{display:flex}
    .cr-mute{width:32px;height:32px;border-radius:10px;background:#F2F2EE;font-size:14px;flex:0 0 auto}.cr-volume{width:86px;accent-color:#111}.cr-ios-volume{display:none;font-size:10px;font-weight:700;color:rgba(0,0,0,.55);white-space:nowrap}.is-ios .cr-volume{display:none}.is-ios .cr-copy{display:block!important;min-width:132px;max-width:145px}.cr-shell.is-open .cr-bars{display:none!important}.cr-close{width:28px;height:28px;border-radius:9px;background:transparent;color:#777;font-size:18px}
    .cr-bars{display:none;align-items:flex-end;gap:2px;height:15px;margin-left:1px}.cr-shell.is-playing .cr-bars{display:flex}
    .cr-bars i{display:block;width:3px;border-radius:3px;background:#111;animation:crEq .8s ease-in-out infinite alternate}.cr-bars i:nth-child(1){height:6px}.cr-bars i:nth-child(2){height:12px;animation-delay:.14s}.cr-bars i:nth-child(3){height:8px;animation-delay:.28s}
    @keyframes crEq{from{transform:scaleY(.45);opacity:.5}to{transform:scaleY(1);opacity:1}}
    @media(max-width:390px){.cr-volume{width:68px}.cr-copy{max-width:120px}}
  `;
  document.head.appendChild(style);

  const root=document.createElement('div');
  root.id='crediti-radio-root';
  root.innerHTML=`<div class="cr-shell" id="crShell"><button class="cr-radio-btn" id="crExpand" aria-label="Abrir Rádio Crediti">📻</button><button class="cr-play" id="crPlay" aria-label="Tocar rádio">▶</button><div class="cr-copy"><div class="cr-title">Rádio Crediti</div><div class="cr-status" id="crStatus">Programação variada</div></div><div class="cr-bars"><i></i><i></i><i></i></div><div class="cr-controls"><button class="cr-mute" id="crMute" aria-label="Silenciar">🔊</button><input class="cr-volume" id="crVolume" type="range" min="0" max="100" step="1" aria-label="Volume da rádio"/><span class="cr-ios-volume">Volume: botões do celular</span><button class="cr-close" id="crClose" aria-label="Fechar controles">×</button></div></div>`;
  document.body.appendChild(root);if(IS_IOS)root.classList.add('is-ios');

  const shell=document.getElementById('crShell'),btnExpand=document.getElementById('crExpand'),btnPlay=document.getElementById('crPlay'),btnMute=document.getElementById('crMute'),btnClose=document.getElementById('crClose'),volume=document.getElementById('crVolume'),status=document.getElementById('crStatus');
  volume.value=String(Math.round(lastVolume*100));
  const setStatus=t=>status.textContent=t||'Programação variada';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const setOpen=v=>{expanded=!!v;shell.classList.toggle('is-open',expanded);if(IS_IOS&&expanded&&sourceMode!=='offline')setStatus('Volume: botões do celular')};
  function syncMute(){const off=audio.muted||(!IS_IOS&&audio.volume===0);btnMute.textContent=off?'🔇':(!IS_IOS&&audio.volume<.45?'🔉':'🔊');localStorage.setItem(STORAGE_MUTE,off?'1':'0')}
  function syncPlay(){const playing=!audio.paused&&!audio.ended;shell.classList.toggle('is-playing',playing);btnPlay.textContent=playing?'❚❚':'▶';btnPlay.setAttribute('aria-label',playing?'Pausar rádio':'Tocar rádio')}

  async function fetchTimed(url,ms=1200){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),ms);
    try{return await fetch(url,{cache:'no-store',signal:controller.signal})}finally{clearTimeout(timer)}
  }

  function stationScore(s){const txt=((s.name||'')+' '+(s.tags||'')).toLowerCase(),genres=['sertanejo','forro','forró','pop','rock','romant','mpb','flashback','dance','hits','eclet','eclectic','varied','variad','musica','música'],bad=['news','noticia','notícia','talk','jornal','sports','esporte','podcast'];let score=genres.reduce((n,g)=>n+(txt.includes(g)?1:0),0)*120+Math.log1p(Number(s.votes)||0)*14+Math.min(80,(Number(s.bitrate)||0)/3);if(txt.includes('variety')||txt.includes('variad')||txt.includes('eclet'))score+=220;if(txt.includes('hits')||txt.includes('music')||txt.includes('musica')||txt.includes('música'))score+=70;bad.forEach(k=>{if(txt.includes(k))score-=180});return score}

  async function fetchStations(){
    if(preparing||!navigator.onLine)return prepared;
    preparing=true;
    if(sourceMode==='live')setStatus('Conectando à rádio…');
    const query='/json/stations/search?countrycode=BR&hidebroken=true&is_https=true&order=votes&reverse=true&limit=180';
    let data=null;
    for(const host of API_HOSTS){
      try{
        const r=await fetchTimed(host+query,1100);
        if(!r.ok)continue;
        const j=await r.json();
        if(Array.isArray(j)&&j.length){data=j;break}
      }catch(_){}
    }
    if(data){
      stations=data.filter(s=>{const u=(s.url_resolved||s.url||'').trim(),c=(s.codec||'').toLowerCase();return u.startsWith('https://')&&!/(m3u8|hls)/i.test(u)&&c==='mp3'&&Number(s.bitrate||0)>=128&&Number(s.bitrate||0)<=320}).sort((a,b)=>stationScore(b)-stationScore(a)).slice(0,24);
      if(stations.length){currentIndex=0;prepared=true;if(sourceMode==='live'&&!audio.src)loadLive(false)}
    }
    preparing=false;
    return prepared;
  }

  const stationUrl=s=>(s&&(s.url_resolved||s.url)||'').trim();
  function stopSource(){switching=true;clearTimeout(liveFallbackTimer);audio.pause();audio.removeAttribute('src');audio.load();audio.playbackRate=1;audio.defaultPlaybackRate=1;setTimeout(()=>switching=false,350)}
  function loadLive(autoplay){const s=stations[currentIndex],u=stationUrl(s);if(!u)return false;stopSource();sourceMode='live';audio.src=u;audio.load();if('mediaSession'in navigator){try{navigator.mediaSession.metadata=new MediaMetadata({title:'Rádio Crediti',artist:'Programação variada',album:s.name||'Rádio online'})}catch(_){}}if(autoplay)audio.play().catch(()=>fallbackToOffline(true));return true}

  async function cachedTracks(){
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
  }

  async function loadOffline(autoplay,advance=false){
    clearTimeout(liveFallbackTimer);
    const available=await cachedTracks();
    if(!available.length){setStatus('Playlist offline ainda está sendo preparada');syncPlay();return false}
    if(advance)offlineIndex=(offlineIndex+1)%available.length;else offlineIndex=Math.min(offlineIndex,available.length-1);
    const t=available[offlineIndex];
    stopSource();sourceMode='offline';audio.src=t.playUrl||t.url;audio.load();setStatus(`Offline • ${t.title}`);
    if('mediaSession'in navigator){try{navigator.mediaSession.metadata=new MediaMetadata({title:t.title,artist:'Rádio Crediti Offline',album:'Playlist local CC0'})}catch(_){}}
    if(autoplay){try{await audio.play()}catch(_){setStatus('Toque novamente em Play para ouvir offline')}}
    return true;
  }

  async function fallbackToOffline(autoplay=true){
    if(sourceMode==='offline')return;
    const ok=await loadOffline(autoplay,false);
    if(!ok)setStatus(navigator.onLine?'Sem rádio online e sem playlist salva':'Sem internet • abra uma vez online para preparar o offline');
  }
  async function switchToOffline(){const wasPlaying=!audio.paused;await loadOffline(wasPlaying,false);if(!wasPlaying)syncPlay()}
  async function switchToLive(){if(!navigator.onLine)return;const wasPlaying=!audio.paused;const ok=await fetchStations();if(ok){sourceMode='live';loadLive(wasPlaying)}}

  function armLiveFallback(){
    if(sourceMode!=='live')return;
    clearTimeout(liveFallbackTimer);
    liveFallbackTimer=setTimeout(()=>{if(sourceMode==='live'&&audio.readyState<3)fallbackToOffline(true)},2800);
  }
  function tryNextLive(){
    if(!navigator.onLine){fallbackToOffline(true);return}
    liveFailures++;
    if(liveFailures>=2){fallbackToOffline(true);return}
    if(!stations.length){fallbackToOffline(true);return}
    currentIndex=(currentIndex+1)%stations.length;setStatus('Buscando outra programação…');loadLive(true);armLiveFallback();
  }

  btnExpand.addEventListener('click',()=>setOpen(!expanded));
  btnClose.addEventListener('click',()=>setOpen(false));
  btnPlay.addEventListener('click',async()=>{
    setOpen(true);
    if(!audio.paused){audio.pause();return}

    const saved=await cachedTracks();
    if(!navigator.onLine){await loadOffline(true,false);return}

    if(sourceMode==='offline'&&saved.length){try{await audio.play();return}catch(_){}}

    setStatus('Conectando à rádio…');
    let onlineReady=prepared;
    if(!onlineReady){
      onlineReady=await Promise.race([fetchStations(),sleep(2400).then(()=>false)]);
    }
    if(!onlineReady){
      const ok=await loadOffline(true,false);
      if(ok)return;
      onlineReady=await fetchStations();
    }
    if(onlineReady){
      if(sourceMode!=='live'||!audio.src)loadLive(false);
      try{await audio.play();armLiveFallback()}catch(_){await fallbackToOffline(true)}
    }else await fallbackToOffline(true);
  });

  btnMute.addEventListener('click',()=>{if(IS_IOS){audio.muted=!audio.muted}else if(audio.volume===0){audio.volume=lastVolume;volume.value=String(Math.round(lastVolume*100));audio.muted=false}else{lastVolume=audio.volume;audio.volume=0;volume.value='0';audio.muted=true}syncMute()});
  volume.addEventListener('input',()=>{if(IS_IOS){setStatus('Volume: botões do celular');return}const v=Math.max(0,Math.min(1,Number(volume.value)/100));audio.volume=v;audio.muted=v===0;if(v>0){lastVolume=v;localStorage.setItem(STORAGE_VOL,String(v))}syncMute()});

  audio.addEventListener('play',()=>{syncPlay();if(sourceMode==='offline'){const t=OFFLINE_PLAYLIST.find(x=>(audio.src||'').includes(encodeURIComponent(x.remote))||audio.src===x.remote||audio.src.endsWith(x.url));setStatus(`Offline • ${t?.title||'playlist salva'}`)}else setStatus('Tocando • qualidade alta')});
  audio.addEventListener('pause',()=>{syncPlay();if(switching)return;if(sourceMode==='offline')setStatus('Offline pausado • toque para continuar');else if(prepared)setStatus('Pausado • toque para continuar')});
  audio.addEventListener('waiting',()=>{setStatus(sourceMode==='offline'?'Abrindo música offline…':'Conectando à rádio…');if(sourceMode==='live')armLiveFallback()});
  audio.addEventListener('stalled',()=>{if(switching)return;if(sourceMode==='live')armLiveFallback()});
  audio.addEventListener('error',()=>{if(switching)return;syncPlay();if(sourceMode==='offline')setTimeout(()=>loadOffline(true,true),300);else tryNextLive()});
  audio.addEventListener('ended',()=>{if(switching)return;sourceMode==='offline'?loadOffline(true,true):tryNextLive()});
  audio.addEventListener('playing',()=>{clearTimeout(liveFallbackTimer);if(sourceMode==='live'){liveFailures=0;setStatus('Tocando • qualidade alta')}});

  window.addEventListener('offline',()=>fallbackToOffline(!audio.paused));
  window.addEventListener('online',()=>{cacheOfflinePlaylist();if(sourceMode==='offline'&&audio.paused)fetchStations()});
  if('mediaSession'in navigator){try{navigator.mediaSession.setActionHandler('play',()=>btnPlay.click());navigator.mediaSession.setActionHandler('pause',()=>audio.pause());navigator.mediaSession.setActionHandler('nexttrack',()=>sourceMode==='offline'?loadOffline(true,true):tryNextLive())}catch(_){}}

  syncMute();syncPlay();setOpen(false);
  cachedTracks().then(list=>{if(!navigator.onLine)setStatus(list.length?`Offline pronto • ${list.length} músicas`:'Offline ainda não baixado')});
  if(navigator.onLine){fetchStations();setTimeout(cacheOfflinePlaylist,1200)}else sourceMode='offline';
})();
