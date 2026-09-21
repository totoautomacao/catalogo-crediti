(()=>{
  const qs=new URLSearchParams(location.search);
  if(qs.get('cliente')!=='1'||document.getElementById('crediti-radio-root'))return;

  const STATIONS=[
    {name:'Rádio Jangadeiro 88.9 FM',url:'https://stream.zeno.fm/xuh02vfzurhvv'},
    {name:'Classic Pan 76.7 FM',url:'https://stream.zeno.fm/rtk4pzcome3vv'},
    {name:'FM O Dia 99.7 FM',url:'https://wz7.servidoresbrasil.com:8274/stream'},
    {name:'Jovem Pan FM 100.9',url:'https://stream.zeno.fm/c45wbq2us3buv'},
    {name:'Jovem Pan BH',url:'https://8062.brasilstream.com.br/mp3'}
  ];

  const STORAGE_VOL='crediti_radio_volume_v1';
  const STORAGE_MUTE='crediti_radio_mute_v1';
  const DEFAULT_VOL=.22;
  const IS_IOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const audio=new Audio();
  audio.preload='none';
  audio.playsInline=true;

  let currentIndex=0;
  let expanded=false;
  let switching=false;
  let userWantsPlay=false;
  let connectTimer=null;
  let attemptToken=0;
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
    .cr-shell{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.97);backdrop-filter:blur(16px);border:1px solid rgba(0,0,0,.08);box-shadow:0 12px 34px rgba(0,0,0,.14);border-radius:18px;padding:7px;max-width:calc(100vw - 28px)}
    .cr-radio-btn,.cr-play,.cr-mute,.cr-close{border:0;outline:0;cursor:pointer;display:flex;align-items:center;justify-content:center}
    .cr-radio-btn{width:42px;height:42px;border-radius:14px;background:#FDCA01;font-size:21px;flex:0 0 auto}
    .cr-play{width:42px;height:42px;border-radius:14px;background:#111;color:#fff;font-size:16px;flex:0 0 auto}
    .cr-copy{display:none;min-width:0;max-width:165px}.cr-shell.is-open .cr-copy{display:block}
    .cr-title{font-size:12px;font-weight:800;white-space:nowrap}.cr-status{font-size:10px;color:rgba(0,0,0,.52);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}
    .cr-controls{display:none;align-items:center;gap:7px;margin-left:2px}.cr-shell.is-open .cr-controls{display:flex}
    .cr-mute{width:32px;height:32px;border-radius:10px;background:#F2F2EE;font-size:14px;flex:0 0 auto}.cr-volume{width:86px;accent-color:#111}.is-ios .cr-volume{display:none}.is-ios .cr-copy{display:block!important;min-width:132px;max-width:145px}.cr-shell.is-open .cr-bars{display:none!important}.cr-close{width:28px;height:28px;border-radius:9px;background:transparent;color:#777;font-size:18px}
    .cr-bars{display:none;align-items:flex-end;gap:2px;height:15px;margin-left:1px}.cr-shell.is-playing .cr-bars{display:flex}
    .cr-bars i{display:block;width:3px;border-radius:3px;background:#111;animation:crEq .8s ease-in-out infinite alternate}.cr-bars i:nth-child(1){height:6px}.cr-bars i:nth-child(2){height:12px;animation-delay:.14s}.cr-bars i:nth-child(3){height:8px;animation-delay:.28s}
    @keyframes crEq{from{transform:scaleY(.45);opacity:.5}to{transform:scaleY(1);opacity:1}}
    @media(max-width:390px){.cr-volume{width:68px}.cr-copy{max-width:120px}}
  `;
  document.head.appendChild(style);

  const root=document.createElement('div');
  root.id='crediti-radio-root';
  root.innerHTML=`<div class="cr-shell" id="crShell"><button class="cr-radio-btn" id="crExpand" aria-label="Abrir Rádio Crediti">📻</button><button class="cr-play" id="crPlay" aria-label="Tocar rádio">▶</button><div class="cr-copy"><div class="cr-title">Rádio Crediti</div><div class="cr-status" id="crStatus">Ao vivo • toque para ouvir</div></div><div class="cr-bars"><i></i><i></i><i></i></div><div class="cr-controls"><button class="cr-mute" id="crMute" aria-label="Silenciar">🔊</button><input class="cr-volume" id="crVolume" type="range" min="0" max="100" step="1" aria-label="Volume da rádio"/><button class="cr-close" id="crClose" aria-label="Fechar controles">×</button></div></div>`;
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
  const setStatus=t=>{status.textContent=t||'Rádio ao vivo'};
  const setOpen=v=>{expanded=!!v;shell.classList.toggle('is-open',expanded);if(IS_IOS&&expanded&&!audio.paused)setStatus('Volume: botões do celular')};

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

  function clearConnectTimer(){
    if(connectTimer){clearTimeout(connectTimer);connectTimer=null}
  }

  function stopSource(){
    attemptToken++;
    clearConnectTimer();
    switching=true;
    try{audio.pause()}catch(_){}
    audio.removeAttribute('src');
    try{audio.load()}catch(_){}
    setTimeout(()=>{switching=false},250);
  }

  function setMediaSession(station){
    if(!('mediaSession'in navigator))return;
    try{navigator.mediaSession.metadata=new MediaMetadata({title:'Rádio Crediti',artist:'Ao vivo',album:station.name})}catch(_){}
  }

  async function connectStation(index,autoplay=true){
    if(!navigator.onLine){
      stopSource();
      setStatus('Sem conexão');
      syncPlay();
      return false;
    }

    currentIndex=(index+STATIONS.length)%STATIONS.length;
    const station=STATIONS[currentIndex];
    const token=++attemptToken;
    clearConnectTimer();
    switching=true;
    try{audio.pause()}catch(_){}
    audio.src=station.url;
    audio.load();
    switching=false;
    setStatus(`Conectando • ${station.name}`);
    setMediaSession(station);

    return await new Promise(resolve=>{
      let settled=false;
      const finish=ok=>{
        if(settled||token!==attemptToken)return;
        settled=true;
        clearConnectTimer();
        cleanup();
        resolve(ok);
      };
      const onPlaying=()=>finish(true);
      const onError=()=>finish(false);
      const cleanup=()=>{
        audio.removeEventListener('playing',onPlaying);
        audio.removeEventListener('error',onError);
      };
      audio.addEventListener('playing',onPlaying,{once:true});
      audio.addEventListener('error',onError,{once:true});
      connectTimer=setTimeout(()=>finish(false),8000);
      if(autoplay){
        audio.play().catch(()=>finish(false));
      }else finish(true);
    });
  }

  async function startLive(){
    userWantsPlay=true;
    if(!navigator.onLine){
      stopSource();
      setStatus('Sem conexão');
      syncPlay();
      return;
    }

    setStatus('Conectando à rádio…');
    for(let step=0;step<STATIONS.length;step++){
      const ok=await connectStation(currentIndex+step,true);
      if(ok){
        currentIndex=(currentIndex+step)%STATIONS.length;
        setStatus(`Ao vivo • ${STATIONS[currentIndex].name}`);
        return;
      }
      if(!userWantsPlay)return;
    }
    stopSource();
    userWantsPlay=false;
    setStatus('Sem conexão');
    syncPlay();
  }

  async function tryNextLive(){
    if(!userWantsPlay)return;
    if(!navigator.onLine){
      stopSource();
      setStatus('Sem conexão');
      syncPlay();
      return;
    }
    const next=(currentIndex+1)%STATIONS.length;
    for(let step=0;step<STATIONS.length;step++){
      const idx=(next+step)%STATIONS.length;
      const ok=await connectStation(idx,true);
      if(ok){
        currentIndex=idx;
        setStatus(`Ao vivo • ${STATIONS[currentIndex].name}`);
        return;
      }
      if(!userWantsPlay)return;
    }
    stopSource();
    userWantsPlay=false;
    setStatus('Sem conexão');
    syncPlay();
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
    syncPlay();
    if(!IS_IOS||!expanded)setStatus(`Ao vivo • ${STATIONS[currentIndex].name}`);
  });
  audio.addEventListener('pause',()=>{
    syncPlay();
    if(switching)return;
    if(!navigator.onLine)setStatus('Sem conexão');
    else if(!userWantsPlay)setStatus('Pausado • toque para continuar');
  });
  audio.addEventListener('waiting',()=>{if(userWantsPlay)setStatus('Conectando à rádio…')});
  audio.addEventListener('stalled',()=>{if(!switching&&userWantsPlay)tryNextLive()});
  audio.addEventListener('error',()=>{if(!switching&&userWantsPlay)tryNextLive()});
  audio.addEventListener('ended',()=>{if(!switching&&userWantsPlay)tryNextLive()});

  window.addEventListener('offline',()=>{
    const wanted=userWantsPlay||!audio.paused;
    stopSource();
    userWantsPlay=wanted;
    setStatus('Sem conexão');
    syncPlay();
  });

  window.addEventListener('online',()=>{
    if(userWantsPlay){setStatus('Reconectando à rádio…');startLive()}
    else setStatus('Ao vivo • toque para ouvir');
  });

  if('mediaSession'in navigator){
    try{
      navigator.mediaSession.setActionHandler('play',()=>startLive());
      navigator.mediaSession.setActionHandler('pause',()=>{userWantsPlay=false;audio.pause()});
      navigator.mediaSession.setActionHandler('nexttrack',()=>tryNextLive());
    }catch(_){}
  }

  syncMute();
  syncPlay();
  setOpen(false);
  if(!navigator.onLine)setStatus('Sem conexão');
})();
