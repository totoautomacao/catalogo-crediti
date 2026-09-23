(()=>{
  if(window.__creditiVehicleGallery)return;
  window.__creditiVehicleGallery=true;

  const SUPABASE_URL='https://jfguumxlxmveuszddyky.supabase.co';
  const SUPABASE_KEY='sb_publishable_F84YmaFbhJGUmNXYrye1Rw_h6xKvW3B';
  const DB_NAME='crediti-catalogo-offline-v2';
  const DB_STORE='dados';
  const cache=new Map();
  let modal=null,atual=null,indice=0,touchX=null,abertura=0;

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const nome=v=>[v?.marca,v?.modelo].filter(Boolean).join(' ').trim()||'Veículo Crediti';
  const ordenar=v=>[...(v?.fotos_veiculo||[])].sort((a,b)=>(a.ordem||99)-(b.ordem||99));

  function abrirDb(){
    return new Promise((resolve,reject)=>{
      try{
        const req=indexedDB.open(DB_NAME);
        req.onsuccess=()=>resolve(req.result);
        req.onerror=()=>reject(req.error);
      }catch(e){reject(e)}
    });
  }

  async function carregarCacheLocal(){
    try{
      const db=await abrirDb();
      const chave=new URLSearchParams(location.search).get('cliente')==='1'?'veiculos-publicos':'veiculos-internos';
      const dados=await new Promise((resolve,reject)=>{
        const tx=db.transaction(DB_STORE,'readonly');
        const req=tx.objectStore(DB_STORE).get(chave);
        req.onsuccess=()=>resolve(req.result||[]);
        req.onerror=()=>reject(req.error);
      });
      (Array.isArray(dados)?dados:[]).forEach(v=>{
        cache.set(String(v.id),{veiculo:v,fotos:ordenar(v)});
      });
      atualizarBadges();
    }catch(_){}
  }

  function garantirModal(){
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='crediti-vehicle-gallery';
    modal.style.cssText='position:fixed;inset:0;z-index:140;background:rgba(0,0,0,.84);display:none;align-items:center;justify-content:center;padding:10px;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#111;';
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal)fechar()});
    return modal;
  }

  function travarPagina(travar){
    if(travar){document.documentElement.style.overflow='hidden';document.body.style.overflow='hidden'}
    else{document.documentElement.style.removeProperty('overflow');document.body.style.removeProperty('overflow')}
  }

  function fechar(){
    abertura++;
    atual=null;indice=0;touchX=null;
    if(modal){modal.style.display='none';modal.innerHTML=''}
    travarPagina(false);
  }

  function preloadFotos(fotos){
    (fotos||[]).forEach((f,i)=>{
      if(i>4)return;
      try{const img=new Image();img.decoding='async';img.src=f.url_foto}catch(_){}
    });
  }

  function ir(i){
    if(!atual?.fotos?.length)return;
    indice=(i+atual.fotos.length)%atual.fotos.length;
    render();
  }

  function renderCarregando(titulo,fallback){
    const root=garantirModal();root.style.display='flex';travarPagina(true);
    root.innerHTML=`<div style="width:min(920px,100%);max-height:96vh;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.35)"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 15px;border-bottom:1px solid #ecece7"><div style="min-width:0"><div style="font-size:10px;font-weight:900;letter-spacing:.13em;color:#888;text-transform:uppercase">Fotos do veículo</div><div style="font-size:18px;font-weight:900;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(titulo||'Veículo Crediti')}</div></div><button id="crediti-gallery-close" type="button" aria-label="Fechar" style="width:44px;height:44px;min-width:44px;border:0;border-radius:14px;background:#f2f2ed;font-size:26px;font-weight:900;cursor:pointer">×</button></div><div style="height:min(60vh,520px);background:#f5f5f1;display:flex;align-items:center;justify-content:center;position:relative">${fallback?`<img src="${esc(fallback)}" alt="Foto do veículo" style="width:100%;height:100%;object-fit:contain">`:''}<div style="position:absolute;left:50%;bottom:16px;transform:translateX(-50%);background:rgba(0,0,0,.75);color:#fff;border-radius:999px;padding:7px 12px;font-size:11px;font-weight:800;white-space:nowrap">Buscando as outras fotos…</div></div></div>`;
    root.querySelector('#crediti-gallery-close')?.addEventListener('click',fechar);
  }

  function render(){
    if(!atual)return;
    const root=garantirModal();root.style.display='flex';travarPagina(true);
    const fotos=atual.fotos||[];
    if(!fotos.length){
      root.innerHTML=`<div style="width:min(560px,100%);background:#fff;border-radius:24px;overflow:hidden"><div style="display:flex;justify-content:space-between;align-items:center;padding:15px;border-bottom:1px solid #ecece7"><div><div style="font-size:10px;font-weight:900;letter-spacing:.13em;color:#888;text-transform:uppercase">Fotos do veículo</div><div style="font-size:18px;font-weight:900;margin-top:2px">${esc(nome(atual.veiculo))}</div></div><button id="crediti-gallery-close" type="button" style="width:44px;height:44px;border:0;border-radius:14px;background:#f2f2ed;font-size:26px;font-weight:900">×</button></div><div style="padding:34px 20px;text-align:center;color:#777;font-weight:700">Este veículo ainda não possui fotos anexadas.</div></div>`;
      root.querySelector('#crediti-gallery-close')?.addEventListener('click',fechar);return;
    }

    const foto=fotos[indice];
    const thumbs=fotos.map((f,i)=>`<button type="button" data-thumb="${i}" aria-label="Abrir foto ${i+1}" style="width:74px;height:60px;flex:0 0 74px;border:${i===indice?'3px solid #FDCA01':'1px solid #ddd'};border-radius:12px;padding:2px;background:#fff;overflow:hidden;cursor:pointer"><img src="${esc(f.url_foto)}" alt="Miniatura ${i+1}" loading="eager" decoding="async" style="width:100%;height:100%;object-fit:cover;border-radius:8px"></button>`).join('');

    root.innerHTML=`<div style="width:min(980px,100%);max-height:96vh;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.4)"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 15px;border-bottom:1px solid #ecece7"><div style="min-width:0"><div style="font-size:10px;font-weight:900;letter-spacing:.13em;color:#888;text-transform:uppercase">Galeria do veículo</div><div style="font-size:18px;font-weight:900;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(nome(atual.veiculo))}</div><div style="font-size:11px;color:#777;font-weight:800;margin-top:2px">${indice+1} de ${fotos.length} foto${fotos.length>1?'s':''}</div></div><button id="crediti-gallery-close" type="button" aria-label="Fechar" style="width:44px;height:44px;min-width:44px;border:0;border-radius:14px;background:#f2f2ed;font-size:26px;font-weight:900;cursor:pointer;touch-action:manipulation">×</button></div><div id="crediti-gallery-stage" style="height:min(64vh,600px);min-height:250px;background:#f5f5f1;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;touch-action:pan-y"><img src="${esc(foto.url_foto)}" alt="${esc(nome(atual.veiculo))} - foto ${indice+1}" loading="eager" decoding="async" style="width:100%;height:100%;object-fit:contain;user-select:none;-webkit-user-drag:none">${fotos.length>1?`<button id="crediti-gallery-prev" type="button" aria-label="Foto anterior" style="position:absolute;left:9px;top:50%;transform:translateY(-50%);width:46px;height:46px;border:0;border-radius:999px;background:rgba(0,0,0,.72);color:#fff;font-size:28px;font-weight:900;cursor:pointer">‹</button><button id="crediti-gallery-next" type="button" aria-label="Próxima foto" style="position:absolute;right:9px;top:50%;transform:translateY(-50%);width:46px;height:46px;border:0;border-radius:999px;background:rgba(0,0,0,.72);color:#fff;font-size:28px;font-weight:900;cursor:pointer">›</button>`:''}<div style="position:absolute;right:11px;bottom:9px;background:rgba(0,0,0,.72);color:#fff;border-radius:999px;padding:6px 10px;font-size:11px;font-weight:900">${indice+1}/${fotos.length}</div></div><div style="padding:10px 11px 12px;background:#fff"><div style="display:flex;gap:8px;overflow-x:auto;overscroll-behavior-x:contain;padding:2px 1px 4px">${thumbs}</div><div style="font-size:10.5px;color:#777;font-weight:700;text-align:center;margin-top:4px">Toque na miniatura, nas setas ou deslize a foto.</div></div></div>`;

    root.querySelector('#crediti-gallery-close')?.addEventListener('click',fechar);
    root.querySelector('#crediti-gallery-prev')?.addEventListener('click',()=>ir(indice-1));
    root.querySelector('#crediti-gallery-next')?.addEventListener('click',()=>ir(indice+1));
    root.querySelectorAll('[data-thumb]').forEach(b=>b.addEventListener('click',()=>ir(Number(b.dataset.thumb))));
    const stage=root.querySelector('#crediti-gallery-stage');
    stage?.addEventListener('touchstart',e=>{touchX=e.touches?.[0]?.clientX??null},{passive:true});
    stage?.addEventListener('touchend',e=>{if(touchX==null)return;const x=e.changedTouches?.[0]?.clientX??touchX;const d=x-touchX;touchX=null;if(Math.abs(d)>45&&fotos.length>1)ir(indice+(d<0?1:-1))},{passive:true});
    setTimeout(()=>root.querySelector(`[data-thumb="${indice}"]`)?.scrollIntoView({behavior:'auto',inline:'center',block:'nearest'}),0);
  }

  async function buscarSomenteVeiculo(id){
    const p=new URLSearchParams();
    p.set('id',`eq.${id}`);
    p.set('select','id,marca,modelo,fotos_veiculo(id,url_foto,ordem)');
    p.set('limit','1');
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),7000);
    try{
      const r=await fetch(`${SUPABASE_URL}/rest/v1/veiculos?${p.toString()}`,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,Accept:'application/json'},cache:'no-store',signal:controller.signal});
      if(!r.ok)throw new Error('Falha ao carregar galeria');
      const data=await r.json();
      if(!data?.[0])throw new Error('Veículo não encontrado');
      const item={veiculo:data[0],fotos:ordenar(data[0])};
      cache.set(String(id),item);
      return item;
    }finally{clearTimeout(timer)}
  }

  async function abrir(article){
    const id=article?.id?.replace('veiculo-','');if(!id)return;
    const titulo=article.querySelector('h3')?.textContent?.trim()||'Veículo Crediti';
    const fallback=article.querySelector('img')?.src||'';
    const token=++abertura;
    const pronto=cache.get(String(id));
    if(pronto){
      atual=pronto;indice=0;preloadFotos(pronto.fotos);render();
      buscarSomenteVeiculo(id).then(novo=>{if(token!==abertura)return;atual=novo;indice=Math.min(indice,Math.max(0,novo.fotos.length-1));preloadFotos(novo.fotos);render()}).catch(()=>{});
      return;
    }
    renderCarregando(titulo,fallback);
    try{
      const item=await buscarSomenteVeiculo(id);
      if(token!==abertura)return;
      atual=item;indice=0;preloadFotos(item.fotos);render();
    }catch(e){
      if(token!==abertura)return;
      const root=garantirModal();root.style.display='flex';
      root.innerHTML=`<div style="width:min(520px,100%);background:#fff;border-radius:24px;padding:22px;text-align:center"><div style="font-size:18px;font-weight:900">Não consegui abrir as outras fotos</div><div style="font-size:13px;color:#666;margin-top:6px">A foto principal continua disponível. Verifique a conexão e toque novamente.</div><button id="crediti-gallery-close" type="button" style="margin-top:16px;border:0;border-radius:14px;background:#FDCA01;padding:12px 20px;font-weight:900">Fechar</button></div>`;
      root.querySelector('#crediti-gallery-close')?.addEventListener('click',fechar);
    }
  }

  function quantidadeDoCard(article){
    const texto=article.textContent||'';
    const m=texto.match(/(\d+)\s+fotos?/i);
    return m?Number(m[1]):null;
  }

  function atualizarBadges(){
    document.querySelectorAll('article[id^="veiculo-"]').forEach(article=>{
      const id=article.id.replace('veiculo-','');
      const n=cache.get(String(id))?.fotos?.length||quantidadeDoCard(article)||1;
      let badge=article.querySelector('.crediti-gallery-badge');
      if(!badge){
        article.style.cursor='pointer';
        const foto=article.querySelector('img');const area=foto?.parentElement;
        if(!area)return;
        area.style.position='relative';area.style.cursor='zoom-in';
        badge=document.createElement('span');badge.className='crediti-gallery-badge';
        badge.style.cssText='position:absolute;left:10px;bottom:10px;z-index:3;background:rgba(0,0,0,.8);color:#fff;border-radius:999px;padding:7px 10px;font-size:10px;font-weight:900;letter-spacing:.03em;pointer-events:none;box-shadow:0 3px 10px rgba(0,0,0,.18)';
        area.appendChild(badge);
      }
      badge.textContent=n>1?`TOQUE PARA VER ${n} FOTOS`:'TOQUE PARA AMPLIAR';
    });
  }

  document.addEventListener('click',e=>{
    if(e.target.closest('#crediti-vehicle-gallery,#crediti-share-picker'))return;
    const article=e.target.closest?.('article[id^="veiculo-"]');if(!article)return;
    if(e.target.closest('button,a,input,textarea,select,label,[role="button"]'))return;
    e.preventDefault();abrir(article);
  },true);

  document.addEventListener('keydown',e=>{
    if(!atual)return;
    if(e.key==='Escape')fechar();
    else if(e.key==='ArrowRight'&&atual.fotos.length>1)ir(indice+1);
    else if(e.key==='ArrowLeft'&&atual.fotos.length>1)ir(indice-1);
  });

  const obs=new MutationObserver(()=>atualizarBadges());
  obs.observe(document.documentElement,{childList:true,subtree:true});
  const iniciar=()=>{atualizarBadges();carregarCacheLocal()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar,{once:true});else iniciar();
})();
