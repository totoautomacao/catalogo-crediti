from pathlib import Path
import re

p = Path('radio-crediti.js')
s = p.read_text(encoding='utf-8')

novo = '''  async function loadLive(autoplay,attempt=0){
    if(!stations.length)return false;
    const s=stations[currentIndex];
    const original=stationUrl(s);
    const u=IS_IOS?`/api/radio?i=${currentIndex}&t=${Date.now()}`:original;
    if(!u)return false;
    sourceMode='live';switching=true;
    audio.pause();audio.removeAttribute('src');audio.load();audio.playbackRate=1;audio.defaultPlaybackRate=1;
    audio.src=u;audio.load();
    setTimeout(()=>switching=false,420);
    if('mediaSession'in navigator){try{navigator.mediaSession.metadata=new MediaMetadata({title:'Rádio Crediti',artist:'Programação variada',album:s.name||'Rádio online'})}catch(_){}}
    if(autoplay){if(IS_IOS)await ensureGain();audio.play().catch(()=>setStatus('Toque em Play para ouvir'))}
    return true
  }

  async function cachedTracks'''

s2, n = re.subn(r"  async function loadLive\(autoplay,attempt=0\)\{.*?\n\n  async function cachedTracks", novo, s, count=1, flags=re.S)
if n != 1:
    raise SystemExit('loadLive atual nao encontrado')
p.write_text(s2, encoding='utf-8')

p = Path('index.html')
h = p.read_text(encoding='utf-8')
h2, n = re.subn(r'/radio-crediti\.js\?v=\d+', '/radio-crediti.js?v=8', h, count=1)
if n != 1:
    raise SystemExit('referencia do script radio nao encontrada')
p.write_text(h2, encoding='utf-8')
