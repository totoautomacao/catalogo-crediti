(()=>{
  const qs=new URLSearchParams(location.search);
  if(qs.get('cliente')!=='1'||document.getElementById('crediti-radio-root'))return;

  const API_HOSTS=[
    'https://all.api.radio-browser.info',
    'https://de1.api.radio-browser.info',
    'https://nl1.api.radio-browser.info',
    'https://at1.api.radio-browser.info'
  ];
  const STORAGE_VOL='crediti_radio_volume_v1';
  const STORAGE_MUTE='crediti_radio_mute_v1';
  const DEFAULT_VOL=.22;
  const IS_IOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);

  const audio=new Audio();
  audio.preload='metadata';
  audio.playsInline=true;

  let stations=[];
  let currentIndex=0;
  let preparing=false;
  let prepared=false;
  let expanded=false;
  let switching=false;
  let liveFailures=0;
  let liveTimer=null;
  let userWantsPlay=false;

  let lastVolume=Math.max(.05,Math.min(1,Number(localStorage.getItem(STORAGE_VOL))||DEFAULT_VOL));
  let muted=localStorage.getItem(STORAGE_MUTE)==='1';
  audio.volume=IS_IOS?1:(muted?0:lastVolume);
  audio.muted=!!muted;

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
  root.innerHTML=`<div class="cr-shell" id="crShell"><button class="cr-radio-btn" id="crExpand" aria-label="Abrir Rádio Crediti">📻</button><button class="cr-play" id="crPlay" aria-label="Tocar rádio">▶</button><div class="cr-copy"><div class="cr-title">Rádio Crediti</div><div class="cr-status" id="crStatus">Rádio ao vivo</div></div><div class="cr-bars"><i></i><i></i><i></i></div><div class="cr-controls"><button class="cr-mute" id="crMute" aria-label="Silenciar">🔊</button><input class="cr-volume" id="crVolume" type="range" min="0" max="100" step="1" aria-label="Volume da rádio"/><span class="cr-ios-volume">Volume: botões do celular</span><button class="cr-close" id="crClose" aria-label="Fechar controles">×</button></div></div>`;
  document.body.appendChild(root);
  if(IS_IOS)root.classList.add('is-ios');

  const shell=document.getElementById('crShell');
  const btnExpand=document.getElementById('crExpand');
  const btnPlay=document.getElementById('crPlay');
  const btnMute=document.getElementById('crMute');
  const btnClose=document.getElementById('crClose');
  const volume=document.getElementById('crVolume');
  const status=document.getElementById('crStatus');

  volume.value=String(Math.round(lastVolume*100));
  const setStatus=t=>status.textContent=t||'Rádio ao vivo';
  const setOpen=v=>{expanded=!!v;shell.classList.toggle('is-open',expanded)};

  function syncMute(){
    const off=audio.muted||(!IS_IOS&&audio.volume===0);
    btnMute.textContent=off?'🔇':(!IS_IOS&&audio.volume<.45?'🔉':'🔊');
    localStorage.setItem(STORAGE_MUTE,off?'1':'0');
  }

  function syncPlay(){
    const playing=!audio.paused&&!audio.ended;
    shell.classList.toggle('is-playing',playing);
    btnPlay.textContent=playing?'❚❚':'▶';
    btnPlay.setAttribute('aria-label',playing?'Pausar rádio':'Tocar rádio');
  }

  async function fetchTimed(url,ms=2200){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),ms);
    try{return await fetch(url,{cache:'no-store',signal:controller.signal})}
    finally{clearTimeout(timer)}
  }

  function stationScore(s){
    const txt=((s.name||'')+' '+(s.tags||'')).toLowerCase();
    const genres=['sertanejo','forro','forró','pop','rock','romant','mpb','flashback','dance','hits','eclet','eclectic','varied','variad','musica','música'];
    const bad=['news','noticia','notícia','talk','jornal','sports','esporte','podcast'];
    let score=genres.reduce((n,g)=>n+(txt.includes(g)?1:0),0)*120+Math.log1p(Number(s.votes)||0)*14+Math.min(80,(Number(s.bitrate)||0)/3);
    if(txt.includes('variety')||txt.includes('variad')||txt.includes('eclet'))score+=220;
    if(txt.includes('hits')||txt.includes('music')||txt.includes('musica')||txt.includes('música'))score+=70;
    bad.forEach(k=>{if(txt.includes(k))score-=180});
    return score;
  }

  async function fetchStations(force=false){
    if(!navigator.onLine){setStatus('Sem conexão');prepared=false;return false}
    if(preparing)return prepared;
    if(prepared&&stations.length&&!force)return true;

    preparing=true;
    setStatus('Conectando à rádio…');
    const query='/json/stations/search?countrycode=BR&hidebroken=true&is_https=true&order=votes&reverse=true&limit=200';
    let data=null;

    for(const host of API_HOSTS){
      try{
        const r=await fetchTimed(host+query,2200);
        if(!r.ok)continue;
        const j=await r.json();
        if(Array.isArray(j)&&j.length){data=j;break}
      }catch(_){}
    }

    stations=[];
    if(data){
      const viable=data.filter(s=>{
        const u=(s.url_resolved||s.url||'').trim();
        const c=(s.codec||'').toLowerCase();
        const br=Number(s.bitrate||0);
        return u.startsWith('https://')&&!/(m3u8|hls)/i.test(u)&&['mp3','aac','aacp','aac+'].includes(c)&&(br===0||br>=64);
      });
      const preferred=viable.filter(s=>{
        const c=(s.codec||'').toLowerCase();
        const br=Number(s.bitrate||0);
        return c==='mp3'&&(br===0||br>=96);
      });
      stations=(preferred.length>=4?preferred:viable).sort((a,b)=>stationScore(b)-stationScore(a)).slice(0,36);
    }

    prepared=stations.length>0;
    preparing=false;
    if(prepared){currentIndex=Math.min(currentIndex,stations.length-1);setStatus('Rádio ao vivo pronta')}
    else setStatus(navigator.onLine?'Rádio ao vivo indisponível':'Sem conexão');
    return prepared;
  }

  const stationUrl=s=>(s&&(s.url_resolved||s.url)||'').trim();

  function stopSource(){
    switching=true;
    clearTimeout(liveTimer);
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    audio.playbackRate=1;
    audio.defaultPlaybackRate=1;
    setTimeout(()=>switching=false,300);
  }

  function loadLive(autoplay=false){
    const s=stations[currentIndex];
    const u=stationUrl(s);
    if(!u)return false;
    stopSource();
    audio.src=u;
    audio.load();
    if('mediaSession'in navigator){
      try{navigator.mediaSession.metadata=new MediaMetadata({title:'Rádio Crediti',artist:'Rádio ao vivo',album:s.name||'Programação variada'})}catch(_){}
    }
    if(autoplay)audio.play().catch(()=>tryNextLive());
    return true;
  }

  function armLiveTimer(){
    clearTimeout(liveTimer);
    liveTimer=setTimeout(()=>{
      if(userWantsPlay&&audio.readyState<3)tryNextLive();
    },6500);
  }

  async function tryNextLive(){
    if(!navigator.onLine){
      handleOffline();
      return;
    }
    if(!stations.length){
      const ok=await fetchStations(true);
      if(!ok){setStatus('Rádio ao vivo indisponível');return}
    }
    liveFailures++;
    if(liveFailures>=Math.min(6,stations.length)){
      stopSource();
      userWantsPlay=false;
      setStatus('Rádio ao vivo indisponível');
      syncPlay();
      return;
    }
    currentIndex=(currentIndex+1)%stations.length;
    setStatus('Buscando outra rádio ao vivo…');
    loadLive(true);
    armLiveTimer();
  }

  function handleOffline(){
    const wanted=userWantsPlay||!audio.paused;
    stopSource();
    userWantsPlay=wanted;
    prepared=false;
    setStatus('Sem conexão');
    syncPlay();
  }

  async function startLive(){
    if(!navigator.onLine){
      userWantsPlay=true;
      setStatus('Sem conexão');
      syncPlay();
      return;
    }
    userWantsPlay=true;
    liveFailures=0;
    const ok=await fetchStations(false);
    if(!ok){setStatus('Rádio ao vivo indisponível');syncPlay();return}
    loadLive(false);
    try{
      await audio.play();
      armLiveTimer();
    }catch(_){
      tryNextLive();
    }
  }

  btnExpand.addEventListener('click',()=>setOpen(!expanded));
  btnClose.addEventListener('click',()=>setOpen(false));
  btnPlay.addEventListener('click',async()=>{
    setOpen(true);
    if(!audio.paused){
      userWantsPlay=false;
      audio.pause();
      return;
    }
    await startLive();
  });

  btnMute.addEventListener('click',()=>{
    if(IS_IOS){
      audio.muted=!audio.muted;
      if(expanded)setStatus('Volume: botões do celular');
    }else if(audio.volume===0){
      audio.volume=lastVolume;
      volume.value=String(Math.round(lastVolume*100));
      audio.muted=false;
    }else{
      lastVolume=audio.volume;
      audio.volume=0;
      volume.value='0';
      audio.muted=true;
    }
    syncMute();
  });

  volume.addEventListener('input',()=>{
    if(IS_IOS){setStatus('Volume: botões do celular');return}
    const v=Math.max(0,Math.min(1,Number(volume.value)/100));
    audio.volume=v;
    audio.muted=v===0;
    if(v>0){lastVolume=v;localStorage.setItem(STORAGE_VOL,String(v))}
    syncMute();
  });

  audio.addEventListener('play',()=>{
    userWantsPlay=true;
    syncPlay();
    setStatus('Tocando • rádio ao vivo');
  });
  audio.addEventListener('pause',()=>{
    syncPlay();
    if(switching)return;
    if(!navigator.onLine)setStatus('Sem conexão');
    else if(!userWantsPlay)setStatus('Pausado • toque para continuar');
  });
  audio.addEventListener('waiting',()=>{if(userWantsPlay){setStatus('Conectando à rádio…');armLiveTimer()}});
  audio.addEventListener('stalled',()=>{if(!switching&&userWantsPlay)armLiveTimer()});
  audio.addEventListener('error',()=>{if(!switching&&userWantsPlay)tryNextLive()});
  audio.addEventListener('ended',()=>{if(!switching&&userWantsPlay)tryNextLive()});
  audio.addEventListener('playing',()=>{clearTimeout(liveTimer);liveFailures=0;setStatus('Tocando • rádio ao vivo')});

  window.addEventListener('offline',handleOffline);
  window.addEventListener('online',async()=>{
    setStatus('Reconectando à rádio…');
    prepared=false;
    const ok=await fetchStations(true);
    if(ok&&userWantsPlay){
      liveFailures=0;
      loadLive(true);
      armLiveTimer();
    }
  });

  if('mediaSession'in navigator){
    try{
      navigator.mediaSession.setActionHandler('play',()=>startLive());
      navigator.mediaSession.setActionHandler('pause',()=>{userWantsPlay=false;audio.pause()});
      navigator.mediaSession.setActionHandler('nexttrack',()=>{userWantsPlay=true;tryNextLive()});
    }catch(_){}
  }

  syncMute();
  syncPlay();
  setOpen(false);
  if(navigator.onLine)fetchStations(false);
  else setStatus('Sem conexão');
})();
