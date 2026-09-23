(()=>{
  if(window.__creditiVehicleGallery)return;
  window.__creditiVehicleGallery=true;

  const SUPABASE_URL='https://jfguumxlxmveuszddyky.supabase.co';
  const SUPABASE_KEY='sb_publishable_F84YmaFbhJGUmNXYrye1Rw_h6xKvW3B';
  const cache=new Map();
  let preloadPromise=null;
  let modal=null;
  let atual=null;
  let indice=0;
  let touchX=null;

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const nome=v=>[v?.marca,v?.modelo].filter(Boolean).join(' ').trim()||'Veículo Crediti';
  const ordenar=v=>[...(v?.fotos_veiculo||[])].sort((a,b)=>(a.ordem||99)-(b.ordem||99));

  function garantirModal(){
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='crediti-vehicle-gallery';
    modal.style.cssText='position:fixed;inset:0;z-index:140;background:rgba(0,0,0,.84);display:none;align-items:center;justify-content:center;padding:12px;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#111;touch-action:pan-y;';
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal)fechar()});
    return modal;
  }

  function fechar(){
    atual=null;indice=0;touchX=null;
    if(modal){modal.style.display='none';modal.innerHTML=''}
    document.documentElement.style.removeProperty('overflow');
    document.body.style.removeProperty('overflow');
  }

  function ir(i){
    if(!atual?.fotos?.length)return;
    indice=(i+atual.fotos.length)%atual.fotos.length;
    render();
  }

  function renderCarregando(titulo,fallback){
    const root=garantirModal();root.style.display='flex';
    document.documentElement.style.overflow='hidden';document.body.style.overflow='hidden';
    root.innerHTML=`<div style="width:min(960px,100%);max-height:96vh;background:#fff;border-radius:26px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.35)"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid #ecece7"><div><div style="font-size:10px;font-weight:900;letter-spacing:.13em;color:#888;text-transform:uppercase">Fotos do veículo</div><div style="font-size:18px;font-weight:900;margin-top:2px">${esc(titulo||'Veículo Crediti')}</div></div><button id="crediti-gallery-close" type="button" aria-label="Fechar" style="width:42px;height:42px;border:0;border-radius:13px;background:#f2f2ed;font-size:25px;font-weight:900;cursor:pointer">×</button></div><div style="height:min(62vh,560px);background:#f5f5f1;display:flex;align-items:center;justify-content:center;position:relative">${fallback?`<img src="${esc(fallback)}" alt="Foto do veículo" style="max-width:100%;max-height:100%;object-fit:contain;opacity:.65">`:''}<div style="position:absolute;left:50%;bottom:18px;transform:translateX(-50%);background:rgba(0,0,0,.72);color:#fff;border-radius:999px;padding:8px 13px;font-size:12px;font-weight:800">Carregando fotos…</div></div></div>`;
    root.querySelector('#crediti-gallery-close')?.addEventListener('click',fechar);
  }

  function render(){
    if(!atual)return;
    const root=garantirModal();root.style.display='flex';
    document.documentElement.style.overflow='hidden';document.body.style.overflow='hidden';
    const fotos=atual.fotos||[];
    if(!fotos.length){
      root.innerHTML=`<div style="width:min(620px,100%);background:#fff;border-radius:26px;overflow:hidden"><div style="display:flex;align-items:center;justify-content:space-between;padding:16px;border-bottom:1px solid #ecece7"><div><div style="font-size:10px;font-weight:900;letter-spacing:.13em;color:#888;text-transform:uppercase">Fotos do veículo</div><div style="font-size:19px;font-weight:900;margin-top:2px">${esc(nome(atual.veiculo))}</div></div><button id="crediti-gallery-close" type="button" style="width:42px;height:42px;border:0;border-radius:13px;background:#f2f2ed;font-size:25px;font-weight:900">×</button></div><div style="padding:40px 22px;text-align:center;color:#777;font-weight:700">Este veículo ainda não possui fotos anexadas.</div></div>`;
      root.querySelector('#crediti-gallery-close')?.addEventListener('click',fechar);return;
    }
    const foto=fotos[indice];
    const thumbs=fotos.map((f,i)=>`<button type="button" data-thumb="${i}" aria-label="Abrir foto ${i+1}" style="width:76px;height:62px;flex:0 0 76px;border:${i===indice?'3px solid #FDCA01':'1px solid #ddd'};border-radius:12px;padding:2px;background:#fff;overflow:hidden;cursor:pointer"><img src="${esc(f.url_foto)}" alt="Miniatura ${i+1}" loading="eager" style="width:100%;height:100%;object-fit:cover;border-radius:8px"></button>`).join('');
    root.innerHTML=`<div id="crediti-gallery-panel" style="width:min(1000px,100%);max-height:96vh;background:#fff;border-radius:26px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.4)"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 16px;border-bottom:1px solid #ecece7"><div style="min-width:0"><div style="font-size:10px;font-weight:900;letter-spacing:.13em;color:#888;text-transform:uppercase">Galeria do veículo</div><div style="font-size:18px;font-weight:900;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(nome(atual.veiculo))}</div><div style="font-size:11px;color:#777;font-weight:800;margin-top:2px">${indice+1} de ${fotos.length} foto${fotos.length>1?'s':''}</div></div><button id="crediti-gallery-close" type="button" aria-label="Fechar" style="width:44px;height:44px;min-width:44px;border:0;border-radius:14px;background:#f2f2ed;font-size:26px;font-weight:900;cursor:pointer;touch-action:manipulation">×</button></div><div id="crediti-gallery-stage" style="height:min(65vh,610px);min-height:260px;background:#f5f5f1;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;touch-action:pan-y"><img src="${esc(foto.url_foto)}" alt="${esc(nome(atual.veiculo))} - foto ${indice+1}" style="width:100%;height:100%;object-fit:contain;user-select:none;-webkit-user-drag:none">${fotos.length>1?`<button id="crediti-gallery-prev" type="button" aria-label="Foto anterior" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);width:46px;height:46px;border:0;border-radius:999px;background:rgba(0,0,0,.72);color:#fff;font-size:27px;font-weight:900;cursor:pointer">‹</button><button id="crediti-gallery-next" type="button" aria-label="Próxima foto" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);width:46px;height:46px;border:0;border-radius:999px;background:rgba(0,0,0,.72);color:#fff;font-size:27px;font-weight:900;cursor:pointer">›</button>`:''}<div style="position:absolute;right:12px;bottom:10px;background:rgba(0,0,0,.7);color:#fff;border-radius:999px;padding:6px 10px;font-size:11px;font-weight:900">${indice+1}/${fotos.length}</div></div><div style="padding:11px 12px 13px;background:#fff"><div style="display:flex;gap:8px;overflow-x:auto;overscroll-behavior-x:contain;padding:2px 1px 4px">${thumbs}</div><div style="font-size:10.5px;color:#777;font-weight:700;text-align:center;margin-top:5px">Toque nas miniaturas ou deslize a foto para ver as demais.</div></div></div>`;
    root.querySelector('#crediti-gallery-close')?.addEventListener('click',fechar);
    root.querySelector('#crediti-gallery-prev')?.addEventListener('click',()=>ir(indice-1));
    root.querySelector('#crediti-gallery-next')?.addEventListener('click',()=>ir(indice+1));
    root.querySelectorAll('[data-thumb]').forEach(b=>b.addEventListener('click',()=>ir(Number(b.dataset.thumb))));
    const stage=root.querySelector('#crediti-gallery-stage');
    stage?.addEventListener('touchstart',e=>{touchX=e.touches?.[0]?.clientX??null},{passive:true});
    stage?.addEventListener('touchend',e=>{if(touchX==null)return;const x=e.changedTouches?.[0]?.clientX??touchX;const d=x-touchX;touchX=null;if(Math.abs(d)>45&&fotos.length>1)ir(indice+(d<0?1:-1))},{passive:true});
    setTimeout(()=>root.querySelector(`[data-thumb="${indice}"]`)?.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'}),0);
  }

  async function carregarTodos(){
    const p=new URLSearchParams();
    p.set('select','id,marca,modelo,fotos_veiculo(id,url_foto,ordem)');
    const r=await fetch(`${SUPABASE_URL}/rest/v1/veiculos?${p.toString()}`,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,Accept:'application/json'},cache:'no-store'});
    if(!r.ok)throw new Error('Falha ao carregar galeria');
    const data=await r.json();
    (data||[]).forEach(v=>cache.set(String(v.id),{veiculo:v,fotos:ordenar(v)}));
    atualizarBadges();
    return data||[];
  }

  async function buscar(id){
    const k=String(id);
    if(cache.has(k))return cache.get(k);
    if(preloadPromise){try{await preloadPromise}catch(_){}if(cache.has(k))return cache.get(k)}
    const p=new URLSearchParams();p.set('id',`eq.${id}`);p.set('select','id,marca,modelo,fotos_veiculo(id,url_foto,ordem)');
    const r=await fetch(`${SUPABASE_URL}/rest/v1/veiculos?${p.toString()}`,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,Accept:'application/json'},cache:'no-store'});
    if(!r.ok)throw new Error('Falha ao carregar galeria');
    const data=await r.json();if(!data?.[0])throw new Error('Veículo não encontrado');
    const item={veiculo:data[0],fotos:ordenar(data[0])};cache.set(k,item);return item;
  }

  async function abrir(article){
    const id=article?.id?.replace('veiculo-','');if(!id)return;
    const titulo=article.querySelector('h3')?.textContent?.trim()||'Veículo Crediti';
    const fallback=article.querySelector('img')?.src||'';
    const pronto=cache.get(String(id));
    if(pronto){atual=pronto;indice=0;render();return}
    renderCarregando(titulo,fallback);
    try{atual=await buscar(id);indice=0;render();}catch(e){
      const root=garantirModal();root.style.display='flex';root.innerHTML=`<div style="width:min(520px,100%);background:#fff;border-radius:24px;padding:22px;text-align:center"><div style="font-size:18px;font-weight:900">Não consegui abrir as fotos</div><div style="font-size:13px;color:#666;margin-top:6px">Verifique a conexão e tente novamente.</div><button id="crediti-gallery-close" type="button" style="margin-top:16px;border:0;border-radius:14px;background:#FDCA01;padding:12px 20px;font-weight:900">Fechar</button></div>`;root.querySelector('#crediti-gallery-close')?.addEventListener('click',fechar);
    }
  }

  function atualizarBadges(){
    document.querySelectorAll('article[id^="veiculo-"]').forEach(article=>{
      if(article.dataset.creditiGalleryReady==='1'){
        const id=article.id.replace('veiculo-','');const n=cache.get(String(id))?.fotos?.length;const badge=article.querySelector('.crediti-gallery-badge');if(badge&&n)badge.textContent=`VER ${n} FOTO${n>1?'S':''}`;return;
      }
      article.dataset.creditiGalleryReady='1';article.style.cursor='pointer';
      const foto=article.querySelector('img');const area=foto?.parentElement;
      if(area){area.style.position='relative';area.style.cursor='zoom-in';const badge=document.createElement('span');badge.className='crediti-gallery-badge';const id=article.id.replace('veiculo-','');const n=cache.get(String(id))?.fotos?.length;badge.textContent=n?`VER ${n} FOTO${n>1?'S':''}`:'VER FOTOS';badge.style.cssText='position:absolute;left:10px;bottom:10px;z-index:3;background:rgba(0,0,0,.78);color:#fff;border-radius:999px;padding:6px 9px;font-size:10px;font-weight:900;letter-spacing:.03em;pointer-events:none;box-shadow:0 3px 10px rgba(0,0,0,.18)';area.appendChild(badge)}
    });
  }

  document.addEventListener('click',e=>{
    if(e.target.closest('#crediti-vehicle-gallery,#crediti-share-picker'))return;
    const article=e.target.closest?.('article[id^="veiculo-"]');if(!article)return;
    if(e.target.closest('button,a,input,textarea,select,label,[role="button"]'))return;
    e.preventDefault();abrir(article);
  });

  document.addEventListener('keydown',e=>{
    if(!atual)return;
    if(e.key==='Escape')fechar();
    else if(e.key==='ArrowRight'&&atual.fotos.length>1)ir(indice+1);
    else if(e.key==='ArrowLeft'&&atual.fotos.length>1)ir(indice-1);
  });

  const obs=new MutationObserver(atualizarBadges);obs.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{atualizarBadges();preloadPromise=carregarTodos().catch(()=>[])},{once:true});
  else{atualizarBadges();preloadPromise=carregarTodos().catch(()=>[])}
})();
