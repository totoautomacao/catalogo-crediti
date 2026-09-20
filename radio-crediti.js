(()=>{
  const qs=new URLSearchParams(location.search);
  if(qs.get('cliente')!=='1' || document.getElementById('crediti-radio-root')) return;

  const API_HOSTS=[
    'https://all.api.radio-browser.info',
    'https://de1.api.radio-browser.info',
    'https://nl1.api.radio-browser.info',
    'https://at1.api.radio-browser.info'
  ];
  const STORAGE_VOL='crediti_radio_volume_v1';
  const STORAGE_MUTE='crediti_radio_mute_v1';
  const DEFAULT_VOL=.22;
  const audio=new Audio();
  audio.preload='none';
  audio.playsInline=true;
  let stations=[];
  let currentIndex=0;
  let preparing=false;
  let prepared=false;
  let expanded=false;
  let lastVolume=Math.max(.05,Math.min(1,Number(localStorage.getItem(STORAGE_VOL))||DEFAULT_VOL));
  let muted=localStorage.getItem(STORAGE_MUTE)==='1';
  audio.volume=muted?0:lastVolume;

  const style=document.createElement('style');
  style.textContent=`
    #crediti-radio-root{position:fixed;left:14px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:90;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#111}
    .cr-shell{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.96);backdrop-filter:blur(16px);border:1px solid rgba(0,0,0,.08);box-shadow:0 12px 34px rgba(0,0,0,.14);border-radius:18px;padding:7px;max-width:calc(100vw - 28px);transition:.2s ease}
    .cr-main{display:flex;align-items:center;gap:8px;min-width:0}
    .cr-radio-btn,.cr-play,.cr-mute,.cr-close{border:0;outline:0;cursor:pointer;display:flex;align-items:center;justify-content:center}
    .cr-radio-btn{width:42px;height:42px;border-radius:14px;background:#FDCA01;font-size:21px;flex:0 0 auto}
    .cr-play{width:42px;height:42px;border-radius:14px;background:#111;color:#fff;font-size:16px;flex:0 0 auto}
    .cr-copy{display:none;min-width:0;max-width:150px}
    .cr-shell.is-open .cr-copy{display:block}
    .cr-title{font-size:12px;font-weight:800;white-space:nowrap}
    .cr-status{font-size:10px;color:rgba(0,0,0,.52);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}
    .cr-controls{display:none;align-items:center;gap:7px;margin-left:2px}
    .cr-shell.is-open .cr-controls{display:flex}
    .cr-mute{width:32px;height:32px;border-radius:10px;background:#F2F2EE;font-size:14px;flex:0 0 auto}
    .cr-volume{width:86px;accent-color:#111}
    .cr-close{width:28px;height:28px;border-radius:9px;background:transparent;color:#777;font-size:18px}
    .cr-bars{display:none;align-items:flex-end;gap:2px;height:15px;margin-left:1px}
    .cr-shell.is-playing .cr-bars{display:flex}
    .cr-bars i{display:block;width:3px;border-radius:3px;background:#111;animation:crEq .8s ease-in-out infinite alternate}
    .cr-bars i:nth-child(1){height:6px}.cr-bars i:nth-child(2){height:12px;animation-delay:.14s}.cr-bars i:nth-child(3){height:8px;animation-delay:.28s}
    @keyframes crEq{from{transform:scaleY(.45);opacity:.5}to{transform:scaleY(1);opacity:1}}
    @media(max-width:390px){.cr-volume{width:70px}.cr-copy{max-width:115px}}
  `;
  document.head.appendChild(style);

  const root=document.createElement('div');
  root.id='crediti-radio-root';
  root.innerHTML=`
    <div class="cr-shell" id="crShell">
      <button class="cr-radio-btn" id="crExpand" aria-label="Abrir Rádio Crediti" title="Rádio Crediti">📻</button>
      <button class="cr-play" id="crPlay" aria-label="Tocar rádio" title="Tocar rádio">▶</button>
      <div class="cr-copy">
        <div class="cr-title">Rádio Crediti</div>
        <div class="cr-status" id="crStatus">Programação variada</div>
      </div>
      <div class="cr-bars"><i></i><i></i><i></i></div>
      <div class="cr-controls">
        <button class="cr-mute" id="crMute" aria-label="Silenciar">🔊</button>
        <input class="cr-volume" id="crVolume" type="range" min="0" max="100" step="1" aria-label="Volume da rádio" />
        <button class="cr-close" id="crClose" aria-label="Fechar controles">×</button>
      </div>
    </div>`;
  document.body.appendChild(root);

  const shell=document.getElementById('crShell');
  const btnExpand=document.getElementById('crExpand');
  const btnPlay=document.getElementById('crPlay');
  const btnMute=document.getElementById('crMute');
  const btnClose=document.getElementById('crClose');
  const volume=document.getElementById('crVolume');
  const status=document.getElementById('crStatus');
  volume.value=String(Math.round(lastVolume*100));

  function setStatus(text){status.textContent=text||'Programação variada'}
  function setOpen(v){expanded=!!v;shell.classList.toggle('is-open',expanded)}
  function syncMute(){
    btnMute.textContent=audio.volume===0?'🔇':audio.volume<.45?'🔉':'🔊';
    localStorage.setItem(STORAGE_MUTE,audio.volume===0?'1':'0');
  }
  function syncPlay(){
    const playing=!audio.paused && !audio.ended;
    shell.classList.toggle('is-playing',playing);
    btnPlay.textContent=playing?'❚❚':'▶';
    btnPlay.title=playing?'Pausar rádio':'Tocar rádio';
    btnPlay.setAttribute('aria-label',playing?'Pausar rádio':'Tocar rádio');
  }

  function stationScore(s){
    const txt=((s.name||'')+' '+(s.tags||'')).toLowerCase();
    const genres=['sertanejo','forro','forró','pop','rock','romant','mpb','flashback','dance','hits','eclet','eclectic','varied','variad','musica','música'];
    const bad=['news','noticia','notícia','talk','jornal','sports','esporte','podcast'];
    const diversity=genres.reduce((n,g)=>n+(txt.includes(g)?1:0),0);
    let score=diversity*120 + Math.log1p(Number(s.votes)||0)*14 + Math.min(80,(Number(s.bitrate)||0)/3);
    if(txt.includes('variety')||txt.includes('variad')||txt.includes('eclet')) score+=220;
    if(txt.includes('hits')||txt.includes('music')||txt.includes('musica')||txt.includes('música')) score+=70;
    bad.forEach(k=>{if(txt.includes(k)) score-=180});
    return score;
  }

  async function fetchStations(){
    if(preparing) return;
    preparing=true;
    setStatus('Preparando programação…');
    const query='/json/stations/search?countrycode=BR&hidebroken=true&is_https=true&order=votes&reverse=true&limit=180';
    let data=null;
    for(const host of API_HOSTS){
      try{
        const r=await fetch(host+query,{cache:'no-store'});
        if(!r.ok) continue;
        const j=await r.json();
        if(Array.isArray(j)&&j.length){data=j;break}
      }catch(_){ }
    }
    if(data){
      stations=data
        .filter(s=>{
          const u=(s.url_resolved||s.url||'').trim();
          const c=(s.codec||'').toLowerCase();
          return u.startsWith('https://') && !/(m3u8|hls)/i.test(u) && (!c || /(mp3|aac|aacp|ogg)/i.test(c));
        })
        .sort((a,b)=>stationScore(b)-stationScore(a))
        .slice(0,24);
      if(stations.length){
        currentIndex=0;
        prepared=true;
        loadCurrent(false);
        setStatus('Programação variada • volume baixo');
      }
    }
    preparing=false;
    if(!prepared) setStatus('Rádio indisponível no momento');
  }

  function stationUrl(s){return (s&&(s.url_resolved||s.url)||'').trim()}
  function loadCurrent(autoplay){
    const s=stations[currentIndex];
    const u=stationUrl(s);
    if(!u) return;
    audio.src=u;
    audio.load();
    if('mediaSession' in navigator){
      try{navigator.mediaSession.metadata=new MediaMetadata({title:'Rádio Crediti',artist:'Programação variada',album:s.name||'Rádio online'})}catch(_){ }
    }
    if(autoplay){
      audio.play().catch(()=>{setStatus('Toque em Play para ouvir')});
    }
  }

  function tryNext(){
    if(!stations.length){fetchStations();return}
    currentIndex=(currentIndex+1)%stations.length;
    setStatus('Buscando outra programação…');
    loadCurrent(!audio.paused);
  }

  btnExpand.addEventListener('click',()=>setOpen(!expanded));
  btnClose.addEventListener('click',()=>setOpen(false));
  btnPlay.addEventListener('click',async()=>{
    setOpen(true);
    if(!prepared){
      await fetchStations();
      if(!prepared){setStatus('Rádio indisponível no momento');return}
    }
    if(audio.paused){
      try{
        if(!audio.src) loadCurrent(false);
        await audio.play();
      }catch(_){
        setStatus('Toque novamente em Play para ouvir');
      }
    }else audio.pause();
  });
  btnMute.addEventListener('click',()=>{
    if(audio.volume===0){audio.volume=lastVolume;volume.value=String(Math.round(lastVolume*100))}
    else{lastVolume=audio.volume;audio.volume=0;volume.value='0'}
    syncMute();
  });
  volume.addEventListener('input',()=>{
    const v=Math.max(0,Math.min(1,Number(volume.value)/100));
    audio.volume=v;
    if(v>0){lastVolume=v;localStorage.setItem(STORAGE_VOL,String(v))}
    syncMute();
  });

  audio.addEventListener('play',()=>{syncPlay();setStatus('Tocando • programação variada')});
  audio.addEventListener('pause',()=>{syncPlay();if(prepared)setStatus('Pausado • toque para continuar')});
  audio.addEventListener('waiting',()=>setStatus('Conectando à rádio…'));
  audio.addEventListener('stalled',()=>setStatus('Reconectando…'));
  audio.addEventListener('error',()=>{syncPlay();setTimeout(tryNext,450)});
  audio.addEventListener('playing',()=>setStatus('Tocando • programação variada'));

  if('mediaSession' in navigator){
    try{
      navigator.mediaSession.setActionHandler('play',()=>audio.play().catch(()=>{}));
      navigator.mediaSession.setActionHandler('pause',()=>audio.pause());
    }catch(_){ }
  }

  syncMute();
  syncPlay();
  setOpen(false);
  fetchStations();
})();
