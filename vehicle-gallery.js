(()=>{
  if(window.__creditiVehicleGalleryV35)return;
  window.__creditiVehicleGalleryV35=true;
  const SUPABASE_URL='https://jfguumxlxmveuszddyky.supabase.co';
  const SUPABASE_KEY='sb_publishable_F84YmaFbhJGUmNXYrye1Rw_h6xKvW3B';
  const qs=new URLSearchParams(location.search);
  const pathMatch=location.pathname.match(/^\/(?:moto|carro|veiculo)\/([^/?#]+)/i);
  const veiculoDoLink=qs.get('veiculo')||(pathMatch?decodeURIComponent(pathMatch[1]):null);
  const cache=new Map();
  let modal=null, atual=null, indice=0, linkAberto=false, token=0;
  let startX=0,startY=0,dragging=false;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const ordenar=f=>[...(f||[])].filter(x=>x?.url_foto).sort((a,b)=>(a.ordem??999)-(b.ordem??999));
  const titulo=a=>a?.querySelector('h3')?.textContent?.trim()||'Veículo Crediti';

  function ensure(){
    if(modal)return modal;
    modal=document.createElement('div');modal.id='crediti-vehicle-gallery';
    modal.style.cssText='position:fixed;inset:0;z-index:240;background:rgba(0,0,0,.9);display:none;align-items:center;justify-content:center;padding:8px;font-family:Inter,system-ui,sans-serif;color:#111;overscroll-behavior:contain';
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal)fechar()});
    return modal;
  }
  function lock(on){
    document.documentElement.classList.toggle('crediti-gallery-open',on);
    document.body.classList.toggle('crediti-gallery-open',on);
    if(!document.getElementById('crediti-gallery-lock-style')){
      const s=document.createElement('style');s.id='crediti-gallery-lock-style';s.textContent='html.crediti-gallery-open,body.crediti-gallery-open{overflow:hidden!important;overscroll-behavior:none!important}#crediti-gallery-stage{touch-action:none!important;-webkit-user-select:none;user-select:none}';document.head.appendChild(s);
    }
  }
  function fechar(){token++;atual=null;indice=0;dragging=false;if(modal){modal.style.display='none';modal.replaceChildren()}lock(false)}
  function mover(d){if(!atual?.fotos?.length)return;indice=(indice+d+atual.fotos.length)%atual.fotos.length;render()}
  function render(){
    if(!atual?.fotos?.length)return;
    const r=ensure(),f=atual.fotos;indice=Math.max(0,Math.min(indice,f.length-1));
    const thumbs=f.map((x,i)=>`<button type="button" data-thumb="${i}" style="width:68px;height:54px;flex:0 0 68px;border:${i===indice?'3px solid #FDCA01':'1px solid #ddd'};border-radius:10px;padding:2px;background:#fff"><img src="${esc(x.url_foto)}" style="width:100%;height:100%;object-fit:cover;border-radius:6px" loading="lazy"></button>`).join('');
    r.style.display='flex';lock(true);
    r.innerHTML=`<div style="width:min(980px,100%);max-height:96dvh;background:#fff;border-radius:20px;overflow:hidden"><div style="display:flex;align-items:center;justify-content:space-between;padding:11px 13px;border-bottom:1px solid #eee"><div style="min-width:0"><div style="font-size:17px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(atual.titulo)}</div><div style="font-size:11px;color:#777;font-weight:800">${indice+1} de ${f.length} fotos</div></div><button id="cg-close" style="width:44px;height:44px;border:0;border-radius:14px;background:#f1f1ed;font-size:25px">×</button></div><div id="crediti-gallery-stage" style="height:min(66dvh,610px);min-height:250px;background:#f5f5f1;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden"><img src="${esc(f[indice].url_foto)}" alt="${esc(atual.titulo)}" style="width:100%;height:100%;object-fit:contain;pointer-events:none;-webkit-user-drag:none">${f.length>1?`<button id="cg-prev" style="position:absolute;left:8px;top:50%;transform:translateY(-50%);width:46px;height:46px;border:0;border-radius:50%;background:rgba(0,0,0,.7);color:#fff;font-size:28px">‹</button><button id="cg-next" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);width:46px;height:46px;border:0;border-radius:50%;background:rgba(0,0,0,.7);color:#fff;font-size:28px">›</button>`:''}<div style="position:absolute;right:10px;bottom:9px;background:rgba(0,0,0,.7);color:#fff;border-radius:99px;padding:5px 9px;font-size:11px;font-weight:900">${indice+1}/${f.length}</div></div>${f.length>1?`<div style="display:flex;gap:7px;overflow-x:auto;padding:9px 10px 11px;overscroll-behavior-x:contain">${thumbs}</div>`:''}</div>`;
    r.querySelector('#cg-close')?.addEventListener('click',fechar,{once:true});
    r.querySelector('#cg-prev')?.addEventListener('click',()=>mover(-1),{once:true});
    r.querySelector('#cg-next')?.addEventListener('click',()=>mover(1),{once:true});
    r.querySelectorAll('[data-thumb]').forEach(b=>b.addEventListener('click',()=>{indice=Number(b.dataset.thumb)||0;render()},{once:true}));
    const st=r.querySelector('#crediti-gallery-stage');
    st?.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;startX=e.clientX;startY=e.clientY;dragging=true;try{st.setPointerCapture(e.pointerId)}catch(_){}},{passive:true});
    st?.addEventListener('pointerup',e=>{if(!dragging)return;dragging=false;const dx=e.clientX-startX,dy=e.clientY-startY;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.15&&f.length>1)mover(dx<0?1:-1)},{passive:true});
    st?.addEventListener('pointercancel',()=>{dragging=false},{passive:true});
  }
  async function buscar(id){
    if(cache.has(String(id)))return cache.get(String(id));
    const c=new AbortController(),t=setTimeout(()=>c.abort(),5000);
    try{const u=`${SUPABASE_URL}/rest/v1/fotos_veiculo?veiculo_id=eq.${encodeURIComponent(id)}&select=id,url_foto,ordem&order=ordem.asc`;const r=await fetch(u,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`},cache:'no-store',signal:c.signal});if(!r.ok)throw 0;const f=ordenar(await r.json());cache.set(String(id),f);return f}finally{clearTimeout(t)}
  }
  async function abrir(article){
    if(!article)return;const id=article.id?.replace('veiculo-','');if(!id)return;const my=++token;
    const fallback=article.querySelector('img')?.currentSrc||article.querySelector('img')?.src||'';
    atual={id,titulo:titulo(article),fotos:cache.get(String(id))||(fallback?[{url_foto:fallback,ordem:1}]:[])};indice=0;if(atual.fotos.length)render();
    try{const f=await buscar(id);if(my!==token||!f.length)return;atual={id,titulo:titulo(article),fotos:f};indice=0;render();atualizar()}catch(_){}
  }
  function qtd(a){const m=(a.textContent||'').match(/(\d+)\s+fotos?/i);return m?Math.max(1,+m[1]||1):1}
  function preparar(a){
    if(!a||a.dataset.creditiGalleryReady==='1')return;const img=a.querySelector('img'),area=img?.parentElement;if(!img||!area)return;a.dataset.creditiGalleryReady='1';area.style.position='relative';
    const b=document.createElement('button');b.type='button';b.className='crediti-gallery-badge';b.style.cssText='position:absolute;left:10px;bottom:10px;z-index:12;border:0;background:rgba(0,0,0,.88);color:#fff;border-radius:999px;padding:9px 12px;font-size:10px;font-weight:900;touch-action:manipulation';b.textContent=qtd(a)>1?`VER ${qtd(a)} FOTOS`:'AMPLIAR FOTO';b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();abrir(a)});area.appendChild(b);
    area.addEventListener('click',e=>{if(e.target.closest('button,a'))return;e.preventDefault();abrir(a)});
  }
  function abrirDireto(){if(!veiculoDoLink||linkAberto)return;const a=document.getElementById(`veiculo-${veiculoDoLink}`);if(!a)return;linkAberto=true;a.scrollIntoView({block:'center'});setTimeout(()=>abrir(a),100)}
  function atualizar(){document.querySelectorAll('article[id^="veiculo-"]').forEach(a=>{preparar(a);const b=a.querySelector('.crediti-gallery-badge'),id=a.id.replace('veiculo-',''),n=cache.get(String(id))?.length||qtd(a);if(b)b.textContent=n>1?`VER ${n} FOTOS`:'AMPLIAR FOTO'});abrirDireto()}
  let ot;const obs=new MutationObserver(()=>{clearTimeout(ot);ot=setTimeout(atualizar,120)});obs.observe(document.getElementById('root')||document.body,{childList:true,subtree:true});
  document.addEventListener('keydown',e=>{if(!atual)return;if(e.key==='Escape')fechar();else if(e.key==='ArrowRight')mover(1);else if(e.key==='ArrowLeft')mover(-1)});
  window.addEventListener('pageshow',()=>{lock(false);if(modal&&modal.style.display!=='none')fechar()});
  window.CreditiVehicleGallery={abrirPorId(id){const a=document.getElementById(`veiculo-${id}`);if(!a)return false;abrir(a);return true},fechar};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',atualizar,{once:true});else atualizar();
})();