(()=>{
  if(window.__creditiProfessionalLinksV1)return;
  window.__creditiProfessionalLinksV1=true;

  const CATALOGO_PUBLICO='https://catalogo.creditisolucoes.com.br/';
  const TEXTO='🚘 Catálogo Crediti\nVeja os veículos disponíveis e escolha o seu. No próprio catálogo você pode falar com a gente pelo WhatsApp.';

  function ehBotaoCompartilharCatalogo(el){
    const botao=el?.closest?.('button');
    if(!botao)return null;
    const texto=(botao.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
    return texto.includes('compartilhar catálogo')?botao:null;
  }

  function compartilharCatalogo(){
    const dados={title:'Catálogo Crediti',text:TEXTO,url:CATALOGO_PUBLICO};

    if(navigator.share){
      navigator.share(dados).catch(err=>{
        if(err?.name!=='AbortError')copiarLink();
      });
      return;
    }

    copiarLink();
  }

  function copiarLink(){
    if(navigator.clipboard?.writeText){
      navigator.clipboard.writeText(CATALOGO_PUBLICO)
        .then(()=>alert('Link profissional do catálogo copiado. Agora é só enviar ao cliente.'))
        .catch(()=>window.prompt('Copie o link do catálogo:',CATALOGO_PUBLICO));
      return;
    }
    window.prompt('Copie o link do catálogo:',CATALOGO_PUBLICO);
  }

  document.addEventListener('click',e=>{
    const botao=ehBotaoCompartilharCatalogo(e.target);
    if(!botao)return;

    e.preventDefault();
    e.stopPropagation();
    if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();
    compartilharCatalogo();
  },true);
})();
