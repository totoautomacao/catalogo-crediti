(()=>{
  if(window.__creditiVehicleGalleryV33)return;
  window.__creditiVehicleGalleryV33=true;

  const SUPABASE_URL='https://jfguumxlxmveuszddyky.supabase.co';
  const SUPABASE_KEY='sb_publishable_F84YmaFbhJGUmNXYrye1Rw_h6xKvW3B';
  const DB_NAME='crediti-catalogo-offline-v2';
  const DB_STORE='dados';
  const modoCliente=new URLSearchParams(location.search).get('cliente')==='1';
  const cache=new Map();
  let modal=null,atual=null,indice=0,touchX=null,tokenAbertura=0,observerTimer=null;
  let htmlOverflow='',bodyOverflow='';

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const ordenar=fotos=>[...(fotos||[])].filter(f=>f?.url_foto).sort((a,b)=>(a.ordem||99)-(b.ordem||99));
  const nomeCard=article=>article?.querySelector('h3')?.textContent?.trim()||'Veículo Crediti';

  function garantirModal(){
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='crediti-vehicle-gallery';
    modal.style.cssText='position:fixed;inset:0;z-index:240;background:rgba(0,0,0,.88);display:none;align-items:center;justify-content:center;padding:8px;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#111;';
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal)fechar()});
    return modal;
  }

  function travarPagina(on){
    if(on){
      htmlOverflow=document.documentElement.style.overflow||'';
      bodyOverflow=document.body.style.overflow||'';
      document.documentElement.style.overflow='hidden';
      document.body.style.overflow='hidden';
    }else{
      document.documentElement.style.overflow=htmlOverflow;
      document.body.style.overflow=bodyOverflow;
    }
  }

  function fechar(){
    tokenAbertura++;
    atual=null;indice=0;touchX=null;
    if(modal){modal.style.display='none';modal.innerHTML=''}
    travarPagina(false);
  }

  function mover(delta){
    if(!atual?.fotos?.length)return;
    indice=(indice+delta+atual.fotos.length)%atual.fotos.length;
    render();
  }

  function render(){
    if(!atual?.fotos?.length)return;
    const root=garantirModal();
    const fotos=atual.fotos;
    indice=Math.max(0,Math.min(indice,fotos.length-1));
    const f=fotos[indice];
    const thumbs=fotos.map((x,i)=>`<button type="button" data-crediti-thumb="${i}" aria-label="Abrir foto ${i+1}" style="width:72px;height:58px;flex:0 0 72px;border:${i===indice?'3px solid #FDCA01':'1px solid #ddd'};border-radius:11px;padding:2px;background:#fff;overflow:hidden;touch-action:manipulation"><img src="${esc(x.url_foto)}" alt="Miniatura ${i+1}" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover;border-radius:7px"></button>`).join('');
    root.style.display='flex';
    travarPagina(true);
    root.innerHTML=`<div style="width:min(980px,100%);max-height:96vh;background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.4)">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-bottom:1px solid #ecece7">
        <div style="min-width:0"><div style="font-size:10px;font-weight:900;letter-spacing:.13em;color:#888;text-transform:uppercase">Galeria do veículo</div><div style="font-size:18px;font-weight:900;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(atual.titulo)}</div><div style="font-size:11px;color:#777;font-weight:800;margin-top:2px">${indice+1} de ${fotos.length} foto${fotos.length>1?'s':''}</div></div>
        <button id="crediti-gallery-close" type="button" aria-label="Fechar" style="width:44px;height:44px;min-width:44px;border:0;border-radius:14px;background:#f2f2ed;font-size:26px;font-weight:900;touch-action:manipulation">×</button>
      </div>
      <div id="crediti-gallery-stage" style="height:min(64vh,600px);min-height:250px;background:#f5f5f1;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;touch-action:pan-y">
        <img src="${esc(f.url_foto)}" alt="${esc(atual.titulo)} - foto ${indice+1}" decoding="async" style="width:100%;height:100%;object-fit:contain;user-select:none;-webkit-user-drag:none">
        ${fotos.length>1?`<button id="crediti-gallery-prev" type="button" aria-label="Foto anterior" style="position:absolute;left:8px;top:50%;transform:translateY(-50%);width:46px;height:46px;border:0;border-radius:999px;background:rgba(0,0,0,.72);color:#fff;font-size:28px;font-weight:900;touch-action:manipulation">‹</button><button id="crediti-gallery-next" type="button" aria-label="Próxima foto" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);width:46px;height:46px;border:0;border-radius:999px;background:rgba(0,0,0,.72);color:#fff;font-size:28px;font-weight:900;touch-action:manipulation">›</button>`:''}
        <div style="position:absolute;right:10px;bottom:9px;background:rgba(0,0,0,.72);color:#fff;border-radius:999px;padding:6px 10px;font-size:11px;font-weight:900">${indice+1}/${fotos.length}</div>
      </div>
      ${fotos.length>1?`<div style="padding:10px 11px 12px;background:#fff"><div style="display:flex;gap:8px;overflow-x:auto;overscroll-behavior-x:contain;padding:2px 1px 4px">${thumbs}</div><div style="font-size:10.5px;color:#777;font-weight:700;text-align:center;margin-top:4px">Toque nas miniaturas, nas setas ou deslize a foto.</div></div>`:''}
    </div>`;

    root.querySelector('#crediti-gallery-close')?.addEventListener('click',fechar);
    root.querySelector('#crediti-gallery-prev')?.addEventListener('click',()=>mover(-1));
    root.querySelector('#crediti-gallery-next')?.addEventListener('click',()=>mover(1));
    root.querySelectorAll('[data-crediti-thumb]').forEach(b=>b.addEventListener('click',()=>{indice=Number(b.dataset.creditiThumb)||0;render()}));
    const stage=root.querySelector('#crediti-gallery-stage');
    stage?.addEventListener('touchstart',e=>{touchX=e.touches?.[0]?.clientX??null},{passive:true});
    stage?.addEventListener('touchend',e=>{if(touchX==null)return;const x=e.changedTouches?.[0]?.clientX??touchX;const d=x-touchX;touchX=null;if(Math.abs(d)>42&&fotos.length>1)mover(d<0?1:-1)},{passive:true});
  }

  async function lerOffline(id){
    try{
      const db=await new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
      const chave=modoCliente?'veiculos-publicos':'veiculos-internos';
      const registro=await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readonly');const r=tx.objectStore(DB_STORE).get(chave);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
      const lista=Array.isArray(registro?.dados)?registro.dados:[];
      const v=lista.find(x=>String(x.id)===String(id));
      return v?ordenar(v.fotos_veiculo):[];
    }catch(_){return []}
  }

  async function buscarFotos(id){
    const params=new URLSearchParams();
    params.set('id',`eq.${id}`);
    params.set('select','id,fotos_veiculo(id,url_foto,ordem)');
    params.set('limit','1');
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),6500);
    try{
      const r=await fetch(`${SUPABASE_URL}/rest/v1/veiculos?${params.toString()}`,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,Accept:'application/json'},cache:'no-store',signal:controller.signal});
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const data=await r.json();
      const fotos=ordenar(data?.[0]?.fotos_veiculo||[]);
      if(fotos.length)return fotos;

      const direta=`${SUPABASE_URL}/rest/v1/fotos_veiculo?veiculo_id=eq.${encodeURIComponent(id)}&select=id,url_foto,ordem&order=ordem.asc`;
      const r2=await fetch(direta,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,Accept:'application/json'},cache:'no-store',signal:controller.signal});
      if(!r2.ok)throw new Error(`HTTP ${r2.status}`);
      return ordenar(await r2.json());
    }finally{clearTimeout(timer)}
  }

  async function abrir(article){
    if(!article)return;
    const id=article.id?.replace('veiculo-','');
    if(!id)return;
    const titulo=nomeCard(article);
    const fallback=article.querySelector('img')?.currentSrc||article.querySelector('img')?.src||'';
    const token=++tokenAbertura;

    const salvo=cache.get(String(id));
    atual={id,titulo,fotos:salvo?.length?salvo:(fallback?[{id:'capa',url_foto:fallback,ordem:1}]:[])};
    indice=0;
    if(atual.fotos.length)render();

    const offline=await lerOffline(id);
    if(token!==tokenAbertura)return;
    if(offline.length){
      cache.set(String(id),offline);
      atual={id,titulo,fotos:offline};indice=0;render();
    }

    if(!navigator.onLine)return;
    try{
      const fotos=await buscarFotos(id);
      if(token!==tokenAbertura||!fotos.length)return;
      cache.set(String(id),fotos);
      atual={id,titulo,fotos};indice=0;render();
      atualizarBadges();
    }catch(e){
      console.warn('Galeria: não foi possível atualizar as fotos.',e);
    }
  }

  function qtdCard(article){
    const m=(article.textContent||'').match(/(\d+)\s+fotos?/i);
    return m?Math.max(1,Number(m[1])||1):1;
  }

  function prepararCard(article){
    if(!article||article.dataset.creditiGalleryReady==='1')return;
    const foto=article.querySelector('img');
    const area=foto?.parentElement;
    if(!foto||!area)return;
    article.dataset.creditiGalleryReady='1';
    area.style.position='relative';
    area.style.cursor='zoom-in';

    const n=qtdCard(article);
    const badge=document.createElement('button');
    badge.type='button';
    badge.className='crediti-gallery-badge';
    badge.setAttribute('aria-label','Abrir galeria de fotos do veículo');
    badge.style.cssText='position:absolute;left:10px;bottom:10px;z-index:12;border:0;background:rgba(0,0,0,.88);color:#fff;border-radius:999px;padding:9px 12px;font-size:10px;font-weight:900;letter-spacing:.03em;cursor:pointer;pointer-events:auto;touch-action:manipulation;box-shadow:0 3px 12px rgba(0,0,0,.25)';
    badge.textContent=n>1?`VER ${n} FOTOS`:'AMPLIAR FOTO';
    badge.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();abrir(article)});
    badge.addEventListener('touchend',e=>{e.preventDefault();e.stopPropagation();abrir(article)},{passive:false});
    area.appendChild(badge);

    area.addEventListener('click',e=>{if(e.target.closest('button,a'))return;e.preventDefault();abrir(article)});
  }

  function atualizarBadges(){
    document.querySelectorAll('article[id^="veiculo-"]').forEach(article=>{
      const badge=article.querySelector('.crediti-gallery-badge');
      if(!badge){prepararCard(article);return}
      const id=article.id.replace('veiculo-','');
      const n=cache.get(String(id))?.length||qtdCard(article);
      const texto=n>1?`VER ${n} FOTOS`:'AMPLIAR FOTO';
      if(badge.textContent!==texto)badge.textContent=texto;
    });
  }

  function agendar(){
    clearTimeout(observerTimer);
    observerTimer=setTimeout(atualizarBadges,80);
  }

  document.addEventListener('keydown',e=>{
    if(!atual)return;
    if(e.key==='Escape')fechar();
    else if(e.key==='ArrowRight'&&atual.fotos.length>1)mover(1);
    else if(e.key==='ArrowLeft'&&atual.fotos.length>1)mover(-1);
  });

  const obs=new MutationObserver(agendar);
  obs.observe(document.getElementById('root')||document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',atualizarBadges,{once:true});else atualizarBadges();
})();