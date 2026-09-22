(()=>{
  const qs=new URLSearchParams(location.search);
  if(qs.get('cliente')==='1'||window.__creditiSharePicker)return;
  window.__creditiSharePicker=true;

  const SUPABASE_URL='https://jfguumxlxmveuszddyky.supabase.co';
  const SUPABASE_KEY='sb_publishable_F84YmaFbhJGUmNXYrye1Rw_h6xKvW3B';
  const MAX_FOTOS=5;
  let state={veiculo:null,fotos:[],texto:'',busy:false,erro:'',loading:false};
  let modal=null;

  const dinheiro=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));
  const numeroBR=v=>new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v||0));
  const publicoUrl=v=>`${location.origin}${location.pathname}?cliente=1&veiculo=${encodeURIComponent(v?.id||'')}`;
  const nomeVeiculo=v=>[v?.marca,v?.modelo].filter(Boolean).join(' ').trim()||'Veículo Crediti';

  function mensagem(v){
    const linhas=['🚘 *OPORTUNIDADE CREDITI*','',`*${nomeVeiculo(v)}*`];
    if(v?.versao&&v.versao!==v.modelo)linhas.push(`Versão: ${v.versao}`);
    if(v?.ano_fabricacao||v?.ano_modelo)linhas.push(`Ano: ${v.ano_fabricacao||'—'}/${v.ano_modelo||'—'}`);
    if(Number(v?.quilometragem||0)>0)linhas.push(`KM: ${numeroBR(v.quilometragem)} km`);
    if(v?.descricao)linhas.push('',`✅ ${v.descricao}`);
    if(Number(v?.nosso_valor||0)>0)linhas.push('',`💰 *PREÇO CREDITI: ${dinheiro(v.nosso_valor)}*`);
    linhas.push('','📲 Gostou? Fale com a Crediti para confirmar a disponibilidade e tirar suas dúvidas.','',`🔗 *VER NO CATÁLOGO*`,` ${publicoUrl(v)}`);
    return linhas.join('\n');
  }

  function ensureModal(){
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='crediti-share-picker';
    modal.style.cssText='position:fixed;inset:0;z-index:120;background:rgba(0,0,0,.58);display:none;align-items:flex-end;justify-content:center;padding:0;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#111;';
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal)fechar()});
    return modal;
  }

  function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}

  function render(){
    const root=ensureModal();
    root.style.display='flex';
    if(state.loading){
      root.innerHTML=`<div style="width:100%;max-width:620px;background:#fff;border-radius:28px 28px 0 0;padding:26px;box-shadow:0 -10px 40px rgba(0,0,0,.15)"><div style="font-size:12px;font-weight:800;letter-spacing:.12em;color:#777;text-transform:uppercase">Compartilhar com cliente</div><div style="font-size:22px;font-weight:800;margin-top:4px">Carregando fotos…</div><div style="margin-top:12px;font-size:14px;color:#666">Aguarde um instante para abrir as opções de compartilhamento.</div></div>`;
      return;
    }
    if(!state.veiculo)return;
    const ativas=state.fotos.filter(f=>f.ativo);
    const prontas=ativas.filter(f=>f.file).length;
    const bloqueado=state.busy||!ativas.length||ativas.some(f=>f.status!=='ready'||!f.file);
    const cards=state.fotos.map((f,i)=>{
      const pos=f.ativo?ativas.findIndex(x=>x.key===f.key)+1:0;
      const status=f.status==='loading'?'<span style="position:absolute;left:8px;right:8px;bottom:8px;background:rgba(0,0,0,.74);color:#fff;border-radius:9px;padding:6px 7px;font-size:10px;font-weight:800;text-align:center">PREPARANDO…</span>':f.status==='error'?'<span style="position:absolute;left:8px;right:8px;bottom:8px;background:#B91C1C;color:#fff;border-radius:9px;padding:6px 7px;font-size:10px;font-weight:800;text-align:center">FALHA NA FOTO</span>':'';
      return `<div data-card="${escapeHtml(f.key)}" style="border:1px solid ${f.ativo?'#111':'#ecece7'};background:${f.ativo?'#fff':'#f5f6f2'};opacity:${f.ativo?'1':'.5'};border-radius:18px;padding:8px"><button type="button" data-toggle="${escapeHtml(f.key)}" style="position:relative;width:100%;height:130px;border:0;padding:0;border-radius:13px;overflow:hidden;background:#f7f7f3;cursor:pointer"><img src="${escapeHtml(f.url)}" alt="Foto do veículo" style="width:100%;height:100%;object-fit:contain"><span style="position:absolute;top:8px;left:8px;background:${f.ativo?'#FDCA01':'#111'};color:${f.ativo?'#111':'#fff'};padding:6px 8px;border-radius:999px;font-size:10px;font-weight:900">${f.ativo?`${pos}ª FOTO`:'NÃO ENVIAR'}</span>${status}</button><div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:7px"><button type="button" data-move="${i},-1" ${i===0?'disabled':''} style="height:36px;border:0;border-radius:11px;background:#f0f0eb;font-weight:900;font-size:17px;opacity:${i===0?'.3':'1'}">←</button><button type="button" data-move="${i},1" ${i===state.fotos.length-1?'disabled':''} style="height:36px;border:0;border-radius:11px;background:#f0f0eb;font-weight:900;font-size:17px;opacity:${i===state.fotos.length-1?'.3':'1'}">→</button></div></div>`;
    }).join('');

    root.innerHTML=`<div style="width:100%;max-width:620px;max-height:92vh;overflow:auto;background:#fff;border-radius:28px 28px 0 0;box-shadow:0 -10px 40px rgba(0,0,0,.18)"><div style="position:sticky;top:0;z-index:2;background:#fff;display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:18px 18px 14px;border-bottom:1px solid #ecece7"><div><div style="font-size:11px;font-weight:900;letter-spacing:.12em;color:#777;text-transform:uppercase">Compartilhar com cliente</div><div style="font-size:21px;font-weight:900;margin-top:4px">${escapeHtml(nomeVeiculo(state.veiculo))}</div></div><button type="button" id="crediti-share-close" style="width:40px;height:40px;border:0;border-radius:12px;background:#f2f2ed;font-size:22px;font-weight:800">×</button></div><div style="padding:18px"><div style="font-size:14px;line-height:1.4;color:#555;font-weight:600">Escolha quais fotos vão ser enviadas. Use as setas para definir qual vai primeiro e a ordem das demais.</div><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px;margin-top:14px">${cards||'<div style="grid-column:1/-1;padding:18px;background:#f7f7f3;border-radius:16px;font-weight:700;color:#666">Este veículo não possui fotos.</div>'}</div><div style="margin-top:14px;background:#f7f7f3;border:1px solid #ecece7;border-radius:16px;padding:13px 14px"><div style="font-size:13px;font-weight:900">Fotos + mensagem Crediti</div><div style="font-size:12px;line-height:1.4;color:#666;margin-top:3px">As fotos selecionadas, a mensagem do veículo e o link do catálogo serão enviados para o menu de compartilhamento do celular.</div></div>${state.erro?`<div style="margin-top:11px;background:#fff1f1;color:#a11212;border-radius:14px;padding:11px 13px;font-size:12px;font-weight:800">${escapeHtml(state.erro)}</div>`:''}<div style="display:flex;justify-content:space-between;gap:10px;margin-top:13px;font-size:11px;font-weight:800;color:#777"><span>${prontas}/${ativas.length} foto(s) pronta(s)</span><span>${ativas.length} selecionada(s)</span></div><button type="button" id="crediti-share-open" ${bloqueado?'disabled':''} style="width:100%;min-height:52px;margin-top:9px;border:0;border-radius:17px;background:#FDCA01;color:#111;font-size:15px;font-weight:900;opacity:${bloqueado?'.45':'1'}">${state.busy?'ABRINDO OPÇÕES…':'↗ ABRIR OPÇÕES DE COMPARTILHAMENTO'}</button><div style="text-align:center;font-size:10.5px;line-height:1.35;color:#777;font-weight:700;margin-top:8px">O celular mostrará WhatsApp, Instagram e outros apps disponíveis. Para Story, se o Instagram não aparecer, selecione somente 1 foto.</div></div></div>`;

    root.querySelector('#crediti-share-close')?.addEventListener('click',fechar);
    root.querySelectorAll('[data-toggle]').forEach(btn=>btn.addEventListener('click',()=>{const key=btn.dataset.toggle;state.fotos=state.fotos.map(f=>f.key===key?{...f,ativo:!f.ativo}:f);state.erro='';render()}));
    root.querySelectorAll('[data-move]').forEach(btn=>btn.addEventListener('click',()=>{const [i,d]=btn.dataset.move.split(',').map(Number);const j=i+d;if(j<0||j>=state.fotos.length)return;const a=[...state.fotos];[a[i],a[j]]=[a[j],a[i]];state.fotos=a;render()}));
    root.querySelector('#crediti-share-open')?.addEventListener('click',compartilharAgora);
  }

  function fechar(){
    if(state.busy)return;
    if(modal)modal.style.display='none';
    state={veiculo:null,fotos:[],texto:'',busy:false,erro:'',loading:false};
  }

  async function buscarVeiculo(id){
    const params=new URLSearchParams();
    params.set('id',`eq.${id}`);
    params.set('select','id,categoria,marca,modelo,versao,ano_fabricacao,ano_modelo,nosso_valor,quilometragem,descricao,fotos_veiculo(id,url_foto,ordem)');
    const r=await fetch(`${SUPABASE_URL}/rest/v1/veiculos?${params.toString()}`,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,Accept:'application/json'},cache:'no-store'});
    if(!r.ok)throw new Error('Falha ao carregar veículo');
    const data=await r.json();
    if(!data?.[0])throw new Error('Veículo não encontrado');
    return data[0];
  }

  async function prepararFoto(item,index){
    try{
      const src=`/api/share-image?src=${encodeURIComponent(item.url)}`;
      const r=await fetch(src,{cache:'no-store'});
      if(!r.ok)throw new Error('Falha na imagem');
      const b=await r.blob();
      const tipo=b.type&&b.type.startsWith('image/')?b.type:'image/jpeg';
      const ext=tipo.includes('png')?'png':tipo.includes('webp')?'webp':'jpg';
      const file=new File([b],`crediti-${String(index+1).padStart(2,'0')}.${ext}`,{type:tipo});
      state.fotos=state.fotos.map(f=>f.key===item.key?{...f,file,status:'ready'}:f);
    }catch(e){
      console.warn('Falha ao preparar foto para compartilhamento:',e);
      state.fotos=state.fotos.map(f=>f.key===item.key?{...f,status:'error'}:f);
    }
    render();
  }

  async function abrir(id,titulo){
    state={veiculo:{id,modelo:titulo||'Veículo'},fotos:[],texto:'',busy:false,erro:'',loading:true};
    render();
    try{
      const v=await buscarVeiculo(id);
      const fotos=[...(v.fotos_veiculo||[])].sort((a,b)=>(a.ordem||99)-(b.ordem||99)).slice(0,MAX_FOTOS).map((f,i)=>({key:String(f.id||`${i}-${f.url_foto}`),url:f.url_foto,ativo:true,file:null,status:'loading'}));
      state={veiculo:v,fotos,texto:mensagem(v),busy:false,erro:fotos.length?'':'Este veículo ainda não possui fotos para compartilhar.',loading:false};
      render();
      fotos.forEach((f,i)=>prepararFoto(f,i));
    }catch(e){
      state.loading=false;state.erro='Não foi possível carregar as fotos deste veículo. Verifique a internet e tente novamente.';render();
    }
  }

  function compartilharAgora(){
    if(state.busy)return;
    const itens=state.fotos.filter(f=>f.ativo);
    if(!itens.length){state.erro='Selecione pelo menos uma foto.';render();return}
    if(itens.some(f=>f.status!=='ready'||!f.file)){state.erro='Aguarde todas as fotos selecionadas ficarem prontas.';render();return}
    const files=itens.map(f=>f.file);
    if(!navigator.share){state.erro='Este navegador não oferece compartilhamento de arquivos. Abra pelo navegador normal ou pelo aplicativo instalado.';render();return}
    if(navigator.canShare&&!navigator.canShare({files})){state.erro='Este aparelho não permite compartilhar essas fotos juntas. Selecione menos fotos e tente novamente.';render();return}
    const dados={title:nomeVeiculo(state.veiculo),text:state.texto,files};
    state.busy=true;state.erro='';render();
    // Chamada imediata no clique para preservar a autorização do Android/iPhone.
    navigator.share(dados).then(()=>fechar()).catch(e=>{
      state.busy=false;
      if(e?.name!=='AbortError')state.erro='Não foi possível abrir as opções de compartilhamento. Tente novamente.';
      render();
    });
  }

  function ajustarTextos(){
    document.querySelectorAll('button').forEach(btn=>{
      if(btn.textContent?.trim().includes('Compartilhar com cliente')){
        const dica=btn.nextElementSibling;
        if(dica&&dica.textContent?.includes('No celular/PWA'))dica.textContent='Escolha as fotos e a ordem antes de compartilhar.';
      }
    });
  }

  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('button');
    if(!btn||!btn.textContent?.trim().includes('Compartilhar com cliente'))return;
    const article=btn.closest('article[id^="veiculo-"]');
    if(!article)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    const id=article.id.replace('veiculo-','');
    const titulo=article.querySelector('h3')?.textContent?.trim()||'Veículo';
    abrir(id,titulo);
  },true);

  const obs=new MutationObserver(ajustarTextos);
  obs.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ajustarTextos);else ajustarTextos();
})();
