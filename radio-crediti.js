(()=>{
  const qs=new URLSearchParams(location.search);
  const cliente=qs.get('cliente')==='1'||location.hostname==='catalogo.creditisolucoes.com.br'||location.hostname==='catalogo-crediti-cliente.pages.dev';
  if(!cliente||document.getElementById('crediti-radio-root'))return;

  const STATIONS=[
    {name:'Rádio Clube 105.5 FM',url:'https://8157.brasilstream.com.br/stream'},
    {name:'Antena 1',url:'https://antenaone.crossradio.com.br/stream/1'},
    {name:'Jovem Pan BH',url:'https://8062.brasilstream.com.br/mp3'},
    {name:'Rádio Jangadeiro 88.9 FM',url:'https://stream.zeno.fm/xuh02vfzurhvv'},
    {name:'Classic Pan 76.7 FM',url:'https://stream.zeno.fm/rtk4pzcome3vv'},
    {name:'Jovem Pan FM 100.9',url:'https://stream.zeno.fm/c45wbq2us3buv'}
  ];
  const audio=new Audio();
  audio.preload='none';
  audio.playsInline=true;
  audio.setAttribute('playsinline','');
  const IS_IOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  let index=0,playingWanted=false,expanded=false,token=0,timer=null;

  const style=document.createElement('style');
  style.textContent=`#crediti-radio-root{position:fixed;left:10px;bottom:calc(6px + env(safe-area-inset-bottom));z-index:90;font-family:Inter,system-ui,sans-serif;color:#111;max-width:calc(100vw - 20px)}.cr-shell{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.97);backdrop-filter:blur(16px);border:1px solid rgba(0,0,0,.08);box-shadow:0 12px 34px rgba(0,0,0,.14);border-radius:18px;padding:7px;max-width:calc(100vw - 28px)}.cr-radio-btn,.cr-play,.cr-next,.cr-close{border:0;cursor:pointer;display:flex;align-items:center;justify-content:center}.cr-radio-btn{width:42px;height:42px;border-radius:14px;background:#FDCA01;font-size:21px}.cr-play{width:42px;height:42px;border-radius:14px;background:#111;color:#fff;font-size:16px}.cr-copy{display:none;min-width:0;max-width:185px}.cr-shell.is-open .cr-copy{display:block}.cr-title{font-size:12px;font-weight:800}.cr-status{font-size:10px;color:#666;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cr-controls{display:none;gap:5px}.cr-shell.is-open .cr-controls{display:flex}.cr-next,.cr-close{width:32px;height:32px;border-radius:10px;background:#f2f2ee;font-weight:800}.cr-close{background:transparent;color:#777;font-size:18px}`;
  document.head.appendChild(style);
  const root=document.createElement('div');root.id='crediti-radio-root';root.innerHTML=`<div class="cr-shell" id="crShell"><button class="cr-radio-btn" id="crExpand">📻</button><button class="cr-play" id="crPlay">▶</button><div class="cr-copy"><div class="cr-title">Rádio Crediti</div><div class="cr-status" id="crStatus">Toque para ouvir</div></div><div class="cr-controls"><button class="cr-next" id="crNext" title="Próxima rádio">»</button><button class="cr-close" id="crClose">×</button></div></div>`;document.body.appendChild(root);
  const shell=root.querySelector('#crShell'),play=root.querySelector('#crPlay'),status=root.querySelector('#crStatus');
  const setOpen=v=>{expanded=!!v;shell.classList.toggle('is-open',expanded)};
  const setStatus=t=>status.textContent=t;
  const clearTimer=()=>{if(timer){clearTimeout(timer);timer=null}};
  const sync=()=>{const p=!audio.paused&&!audio.ended;play.textContent=p?'❚❚':'▶';shell.classList.toggle('is-playing',p)};
  function reset(){clearTimer();token++;try{audio.pause()}catch{}audio.removeAttribute('src');try{audio.load()}catch{}sync()}
  async function attempt(i){
    const my=++token;clearTimer();index=((i%STATIONS.length)+STATIONS.length)%STATIONS.length;const s=STATIONS[index];
    setStatus(`Conectando • ${s.name}`);try{audio.pause()}catch{}audio.src=s.url;try{audio.load()}catch{}
    try{
      await audio.play();
      return await new Promise(resolve=>{if(!audio.paused&&audio.readyState>=2)return resolve(true);const ok=()=>done(true),bad=()=>done(false);const done=v=>{if(my!==token)return;clearTimer();audio.removeEventListener('playing',ok);audio.removeEventListener('error',bad);resolve(v)};audio.addEventListener('playing',ok,{once:true});audio.addEventListener('error',bad,{once:true});timer=setTimeout(()=>done(!audio.paused&&audio.readyState>=2),8000)});
    }catch{return false}
  }
  async function start(){
    playingWanted=true;const start=index;
    for(let n=0;n<STATIONS.length&&playingWanted;n++){
      const i=(start+n)%STATIONS.length;
      if(await attempt(i)){index=i;setStatus(`Ao vivo • ${STATIONS[index].name}`);sync();return}
    }
    reset();playingWanted=false;setStatus('Não foi possível conectar. Toque para tentar novamente.');
  }
  root.querySelector('#crExpand').onclick=()=>setOpen(!expanded);
  root.querySelector('#crClose').onclick=()=>setOpen(false);
  root.querySelector('#crNext').onclick=async()=>{playingWanted=true;reset();playingWanted=true;index=(index+1)%STATIONS.length;await start()};
  play.onclick=async()=>{setOpen(true);if(!audio.paused){playingWanted=false;audio.pause();setStatus('Pausado • toque para continuar');sync();return}await start()};
  audio.addEventListener('playing',()=>{clearTimer();setStatus(`Ao vivo • ${STATIONS[index].name}`);sync()});
  audio.addEventListener('pause',sync);
  audio.addEventListener('waiting',()=>{if(playingWanted)setStatus(`Carregando • ${STATIONS[index].name}`)});
  audio.addEventListener('error',()=>{if(playingWanted){clearTimer();setTimeout(()=>{if(playingWanted){index=(index+1)%STATIONS.length;start()}},250)}});
  window.addEventListener('offline',()=>{const wanted=playingWanted;reset();playingWanted=wanted;setStatus('Sem conexão')});
  window.addEventListener('online',()=>{if(playingWanted)start();else setStatus('Toque para ouvir')});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&playingWanted&&audio.paused)start()});
  if('mediaSession'in navigator){try{navigator.mediaSession.setActionHandler('play',start);navigator.mediaSession.setActionHandler('pause',()=>{playingWanted=false;audio.pause()});navigator.mediaSession.setActionHandler('nexttrack',()=>{index=(index+1)%STATIONS.length;start()})}catch{}}
  if(IS_IOS)setStatus('Toque ▶ para ouvir');
  sync();setOpen(false);
})();
