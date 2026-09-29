(()=>{
  if(window.__creditiTrafficGuard)return;
  window.__creditiTrafficGuard=true;

  // Em uma primeira visita ainda pode não existir um service worker controlando a página.
  // O código antigo tentava então baixar TODAS as fotos do catálogo para o cache local.
  // Este bloqueio atua somente nesse cache legado, impedindo o pré-download em massa.
  if('caches' in window){
    try{
      const originalOpen=window.caches.open.bind(window.caches);
      let proteger=true;
      const cacheVazio={
        match:async()=>new Response(null,{status:204}),
        put:async()=>undefined
      };
      window.caches.open=function(name){
        if(proteger&&name==='crediti-fotos-v2')return Promise.resolve(cacheVazio);
        return originalOpen(name);
      };
      navigator.serviceWorker?.addEventListener('controllerchange',()=>{proteger=false},{once:true});
      setTimeout(()=>{proteger=false},15000);
    }catch(_){}
  }

  // Pede ao navegador para só buscar capas fora da tela quando elas se aproximarem da área visível.
  function otimizarImgs(){
    let i=0;
    document.querySelectorAll('article[id^="veiculo-"] img').forEach(img=>{
      if(img.dataset.creditiPerf==='1')return;
      img.dataset.creditiPerf='1';
      img.loading='lazy';
      img.decoding='async';
      if(i>1)img.fetchPriority='low';
      i++;
    });
  }
  const root=document.getElementById('root')||document.body;
  const obs=new MutationObserver(()=>queueMicrotask(otimizarImgs));
  obs.observe(root,{childList:true,subtree:true});
  otimizarImgs();
})();