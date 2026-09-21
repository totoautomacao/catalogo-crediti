(()=>{
  const qs=new URLSearchParams(location.search);
  if(qs.get('cliente')!=='1'||document.getElementById('crediti-radio-root'))return;

  // Streams diretos e HTTPS verificados para tocar no navegador sem depender de busca externa.
  const STATIONS=[
    {name:'Rádio Clube 105.5 FM',url:'https://8157.brasilstream.com.br/stream'},
    {name:'Massa FM 101.1',url:'https://stm01.virtualcast.com.br:8160/massapontagrossa'},
    {name:'Antena 1',url:'https://antenaone.crossradio.com.br/stream/1'},
    {name:'Jovem Pan BH',url:'https://8062.brasilstream.com.br/mp3'},
    {name:'MGT Forró',url:'https://cast.mgtradio.net/radio/8050/aac'},
    {name:'Rádio Viva O Samba',url:'https://servidor33-3.brlogic.com:8020/live'}
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
    .cr-copy{display:none;min-width:0;max-width:170px}.cr-shell.is-open .cr-copy{display:block}
    .cr-title{font-size:12px;font-weight:800;white-space:nowrap}.cr-status{font-size:10px;color:rgba(0,0,0,.54);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}
    .cr-controls{display:none;align-items:center;gap:7px;margin-left:2px}.cr-shell.is-open .cr-controls{display:flex}
    .cr-mute{width:32px;height:32px;border-radius:10px;background:#F2F2EE;font-size:14px;flex:0 0 auto}.cr-volume{width:82px;accent-color:#111}.cr-close{width:28px;height:28px;border-radius:9px;background:transparent;color:#777;font-size:18px}
    .cr-bars{display:none;align-items:flex-end;gap:2px;height:15px;margin-left:1px}.cr-shell.is-playing .cr-bars{display:flex}.cr-shell.is-open .cr-bars{display:none}
    .cr-bars i{display:block;width:3px;border-radius:3px;background:#111;animation:crEq .8s ease-in-out infinite alternate}.cr-bars i:nth-child(1){height:6px}.cr-bars i:nth-child(2){height:12px;animation-delay:.14s}.cr-bars i:nth-child(3){height:8px;animation-delay:.28s}
    .is-ios .cr-volume{display:none}.cr-ios-volume{display:none;font-size:10px;font-weight:700;color:rgba(0,0,0,.55);white-space:nowrap}.is-ios .cr-ios-volume{display:inline}
    @keyframes crEq{from{transform:scaleY(.45);opacity:.5}to{transform:scaleY(1);opacity:1}}
    @media(max-width:390px){.cr-volume{width:64px}.cr-copy{max-width:128px}}
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

  const setStatus=t=>status.textContent=t;
  const setOpen=v=>{expanded=!!v;shell.classList.toggle('is-open',expanded)};
  const currentStation=()=>STATIONS[currentIndex%STATIONS.length];

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

  function clearConnectTimer(){if(connectTimer){clearTimeout(connectTimer);connectTimer=null}}

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
    try{navigator.mediaSession.metadata=new MediaMetadata({title:'Rádio Crediti',artist:station.name,album:'Rádio ao vivo'})}catch(_){}
  }

  async function connectStation(index){
    if(!navigator.onLine){setStatus('Sem conexão');return false}
    currentIndex=(index+STATIONS.length)%STATIONS.length;
    const station=currentStation();
    const token=++attemptToken;
    clearConnectTimer();
    switching=true;
    try{audio.pause()}catch(_){}
    audio.src=station.url;
    try{audio.load()}catch(_){}
    switching=false;
    setStatus(`Conectando • ${station.name}`);
    setMediaSession(station);

    return await new Promise(resolve=>{
      let settled=false;
      const cleanup=()=>{
        audio.removeEventListener('playing',onPlaying);
        audio.removeEventListener('error',onError);
      };
      const finish=ok=>{
        if(settled||token!==attemptToken)return;
        settled=true;
        clearConnectTimer();
        cleanup();
        resolve(ok);
      };
      const onPlaying=()=>finish(true);
      const onError=()=>finish(false);
      audio.addEventListener('playing',onPlaying,{once:true});
      audio.addEventListener('error',onError,{once:true});
      connectTimer=setTimeout(()=>finish(false),6500);
      audio.play().catch(()=>finish(false));
    });
  }

  async function startLive(){
    userWantsPlay=true;
    if(!navigator.onLine){
      stopSource();
      userWantsPlay=true;
      setStatus('Sem conexão');
      syncPlay();
      return;
    }

    const start=currentIndex;
    for(let step=0;step<STATIONS.length;step++){
      if(!userWantsPlay)return;
      const idx=(start+step)%STATIONS.length;
      const ok=await connectStation(idx);
      if(ok){
        currentIndex=idx;
        setStatus(`Ao vivo • ${currentStation().name}`);
        return;
      }
    }
    stopSource();
    userWantsPlay=false;
    setStatus('Rádio ao vivo indisponível');
    syncPlay();
  }

  async function tryNextLive(){
    if(!userWantsPlay)return;
    currentIndex=(currentIndex+1)%STATIONS.length;
    await startLive();
  }

  btnExpand.addEventListener('click',()=>setOpen(!expanded));
  btnClose.addEventListener('click',()=>setOpen(false));
  btnPlay.addEventListener('click',async()=>{
    setOpen(true);
    if(!audio.paused){
      userWantsPlay=false;
      clearConnectTimer();
      audio.pause();
      return;
    }
    await startLive();
  });

  btnMute.addEventListener('click',()=>{
    if(IS_IOS){
      audio.muted=!audio.muted;
      setStatus('Volume: botões do celular');
    }else if(audio.volume===0||audio.muted){
      audio.muted=false;
      audio.volume=lastVolume;
      volume.value=String(Math.round(lastVolume*100));
    }else{
      lastVolume=audio.volume||lastVolume;
      audio.volume=0;
      audio.muted=true;
      volume.value='0';
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

  audio.addEventListener('playing',()=>{
    clearConnectTimer();
    syncPlay();
    setStatus(`Ao vivo • ${currentStation().name}`);
  });
  audio.addEventListener('play',()=>syncPlay());
  audio.addEventListener('pause',()=>{
    syncPlay();
    if(switching)return;
    if(!navigator.onLine)setStatus('Sem conexão');
    else if(!userWantsPlay)setStatus('Pausado • toque para continuar');
  });
  audio.addEventListener('waiting',()=>{if(userWantsPlay)setStatus(`Conectando • ${currentStation().name}`)});
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
    else setStatus('Rádio ao vivo');
  });

  if('mediaSession'in navigator){
    try{
      navigator.mediaSession.setActionHandler('play',()=>{userWantsPlay=true;startLive()});
      navigator.mediaSession.setActionHandler('pause',()=>{userWantsPlay=false;audio.pause()});
      navigator.mediaSession.setActionHandler('nexttrack',()=>tryNextLive());
    }catch(_){}
  }

  syncMute();
  syncPlay();
  setOpen(false);
  setStatus(navigator.onLine?'Rádio ao vivo':'Sem conexão');
})();
