from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')

helpers=r'''
const CREDITI_WHATSAPP='5585992032558';
const CREDITI_MODO_CLIENTE=new URLSearchParams(window.location.search).get('cliente')==='1';
function creditCatalogoPublicoUrl(){return `${window.location.origin}${window.location.pathname}?cliente=1`}
function creditNomePublico(v){return [v?.marca,v?.modelo].filter(Boolean).join(' ').trim()||'Veículo Crediti'}
function creditWhatsappVeiculo(v){
 const nome=creditNomePublico(v);
 const ano=(v?.ano_fabricacao||v?.ano_modelo)?`\n📅 Ano: ${v?.ano_fabricacao||'—'}/${v?.ano_modelo||'—'}`:'';
 const preco=Number(v?.nosso_valor||0)>0?`\n💰 Preço Crediti: ${dinheiro(v.nosso_valor)}`:'';
 const link=`${creditCatalogoPublicoUrl()}&veiculo=${encodeURIComponent(v?.id||'')}`;
 const msg=`Olá! Vi este veículo no Catálogo Crediti e tenho interesse:\n\n🚘 *${nome}*${ano}${preco}\n\nQuero confirmar se ainda está disponível e saber como faço a simulação.\n\n🔗 ${link}`;
 return `https://wa.me/${CREDITI_WHATSAPP}?text=${encodeURIComponent(msg)}`;
}
function falarWhatsappVeiculo(v){window.open(creditWhatsappVeiculo(v),'_blank')}
function falarWhatsappGeral(){
 const msg='Olá! Estou vendo o Catálogo Crediti e quero ajuda para escolher um veículo.';
 window.open(`https://wa.me/${CREDITI_WHATSAPP}?text=${encodeURIComponent(msg)}`,'_blank');
}
async function compartilharCatalogoCompleto(){
 const url=creditCatalogoPublicoUrl();
 const text='🚘 Catálogo Crediti\nVeja os veículos disponíveis e escolha o seu. No próprio catálogo você pode falar com a gente pelo WhatsApp.';
 try{if(navigator.share){await navigator.share({title:'Catálogo Crediti',text,url});return}}catch(e){if(e?.name==='AbortError')return}
 try{await navigator.clipboard.writeText(url);alert('Link do catálogo copiado. Agora é só enviar ao cliente.')}catch{window.prompt('Copie o link do catálogo:',url)}
}
'''
if "const CREDITI_WHATSAPP='5585992032558';" not in s:
    s=s.replace('function App(){',helpers+'\nfunction App(){',1)

old="async function carregar(){setListaLoading(true);const {data,error}=await supabaseClient.from('veiculos').select('*, fotos_veiculo(id,url_foto,ordem)').order('criado_em',{ascending:false});"
new="async function carregar(){setListaLoading(true);const campos=CREDITI_MODO_CLIENTE?'id,categoria,marca,modelo,versao,ano_fabricacao,ano_modelo,nosso_valor,quilometragem,descricao,criado_em,fotos_veiculo(id,url_foto,ordem)':'*, fotos_veiculo(id,url_foto,ordem)';const {data,error}=await supabaseClient.from('veiculos').select(campos).order('criado_em',{ascending:false});"
if old in s:
    s=s.replace(old,new,1)
elif "const campos=CREDITI_MODO_CLIENTE?" not in s:
    raise SystemExit('carregar() esperado nao encontrado')

s=s.replace('{formAberto&&<section id="cadastro"','{!CREDITI_MODO_CLIENTE&&formAberto&&<section id="cadastro"',1)

old_header=''' <header className="glass sticky top-0 z-40 border-b border-black/5"><div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl bg-[#FDCA01] flex items-center justify-center"><Icon name="car"/></div><div><b className="text-lg">Crediti</b><div className="text-[11px] uppercase tracking-[.15em] text-black/45 font-semibold">Catálogo de veículos</div></div></div><button onClick={abrirNovo} className="h-11 px-4 rounded-2xl bg-black text-white font-bold flex items-center gap-2"><Icon name="plus" size={18}/> Novo veículo</button></div></header>'''
new_header=''' <header className="glass sticky top-0 z-40 border-b border-black/5"><div className="max-w-7xl mx-auto px-4 sm:px-6 min-h-16 py-2 flex items-center justify-between gap-3"><div className="flex items-center gap-3 min-w-0"><div className="w-10 h-10 rounded-2xl bg-[#FDCA01] flex items-center justify-center flex-none"><Icon name="car"/></div><div className="min-w-0"><b className="text-lg">Crediti</b><div className="text-[11px] uppercase tracking-[.15em] text-black/45 font-semibold">Catálogo de veículos</div></div></div>{CREDITI_MODO_CLIENTE?<button onClick={falarWhatsappGeral} className="h-11 px-3 sm:px-4 rounded-2xl bg-black text-white font-bold flex items-center gap-2 flex-none"><Icon name="phone" size={18}/><span className="hidden sm:inline">Falar com vendedor</span><span className="sm:hidden">WhatsApp</span></button>:<div className="flex items-center gap-2 flex-none"><button onClick={compartilharCatalogoCompleto} className="h-11 px-3 sm:px-4 rounded-2xl bg-[#FDCA01] text-black font-extrabold flex items-center gap-2"><span className="text-lg leading-none">↗</span><span className="hidden sm:inline">Compartilhar catálogo</span><span className="sm:hidden">Catálogo</span></button><button onClick={abrirNovo} className="h-11 px-3 sm:px-4 rounded-2xl bg-black text-white font-bold flex items-center gap-2"><Icon name="plus" size={18}/><span className="hidden sm:inline">Novo veículo</span><span className="sm:hidden">Novo</span></button></div>}</div></header>'''
if old_header in s:
    s=s.replace(old_header,new_header,1)
elif 'compartilharCatalogoCompleto' not in s[s.find('return <div'):]:
    raise SystemExit('header esperado nao encontrado')

old_hero=''' <section className="rounded-[30px] bg-[#FDCA01] p-6 sm:p-9 soft-shadow"><span className="inline-flex px-3 py-2 rounded-full bg-black text-white text-xs font-bold">ESTOQUE CREDITI</span><h1 className="text-4xl sm:text-6xl font-extrabold tracking-[-.05em] leading-none mt-5 max-w-3xl">Seu catálogo de carros e motos.</h1><p className="mt-4 text-black/60 font-medium">Cadastre, organize e compartilhe oportunidades com seus clientes.</p></section>'''
new_hero=''' <section className="rounded-[30px] bg-[#FDCA01] p-6 sm:p-9 soft-shadow"><span className="inline-flex px-3 py-2 rounded-full bg-black text-white text-xs font-bold">ESTOQUE CREDITI</span><h1 className="text-4xl sm:text-6xl font-extrabold tracking-[-.05em] leading-none mt-5 max-w-3xl">{CREDITI_MODO_CLIENTE?'Escolha seu próximo veículo.':'Seu catálogo de carros e motos.'}</h1><p className="mt-4 text-black/60 font-medium">{CREDITI_MODO_CLIENTE?'Veja os veículos disponíveis e fale direto com a Crediti pelo WhatsApp.':'Cadastre, organize e compartilhe oportunidades com seus clientes.'}</p>{CREDITI_MODO_CLIENTE&&<div className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white/70 px-4 py-3 text-sm font-bold">Somente o preço Crediti é exibido neste catálogo.</div>}</section>'''
if old_hero in s:
    s=s.replace(old_hero,new_hero,1)

old_eye='''<div className="mt-3 flex items-center justify-end gap-2">{precosVisiveis[v.id]&&<span className="text-sm font-extrabold">{Number(v.valor_lojista||0)>0?dinheiro(v.valor_lojista):'Não informado'}</span>}<button type="button" className="eye-btn" onClick={()=>alternarPreco(v.id)} title={precosVisiveis[v.id]?'Ocultar preço':'Mostrar preço'}><Icon name={precosVisiveis[v.id]?'eyeoff':'eye'} size={18}/></button></div>'''
new_eye='''{!CREDITI_MODO_CLIENTE&&<div className="mt-3 flex items-center justify-end gap-2">{precosVisiveis[v.id]&&<span className="text-sm font-extrabold">{Number(v.valor_lojista||0)>0?dinheiro(v.valor_lojista):'Não informado'}</span>}<button type="button" className="eye-btn" onClick={()=>alternarPreco(v.id)} title={precosVisiveis[v.id]?'Ocultar preço':'Mostrar preço'}><Icon name={precosVisiveis[v.id]?'eyeoff':'eye'} size={18}/></button></div>}'''
if old_eye in s:
    s=s.replace(old_eye,new_eye,1)

old_actions='''<button onClick={()=>compartilhar(v)} className="mt-5 h-12 rounded-2xl bg-black text-white font-extrabold flex items-center justify-center gap-2"><Icon name="phone" size={17}/> Compartilhar com cliente</button><div className="text-[11px] text-center text-black/40 font-semibold mt-2">No celular/PWA, tenta enviar todas as fotos anexadas juntas.</div><div className="grid grid-cols-2 gap-2 mt-2"><button onClick={()=>editar(v)} className="h-11 rounded-2xl bg-[#F4F4F0] font-bold flex items-center justify-center gap-2"><Icon name="edit" size={16}/>Editar</button><button onClick={()=>apagar(v.id)} className="h-11 rounded-2xl bg-[#F4F4F0] font-bold flex items-center justify-center gap-2"><Icon name="trash" size={16}/>Apagar</button></div>'''
new_actions='''{CREDITI_MODO_CLIENTE?<button onClick={()=>falarWhatsappVeiculo(v)} className="mt-5 h-12 rounded-2xl bg-black text-white font-extrabold flex items-center justify-center gap-2"><Icon name="phone" size={17}/> Reservar / falar no WhatsApp</button>:<><button onClick={()=>compartilhar(v)} className="mt-5 h-12 rounded-2xl bg-black text-white font-extrabold flex items-center justify-center gap-2"><Icon name="phone" size={17}/> Compartilhar com cliente</button><div className="text-[11px] text-center text-black/40 font-semibold mt-2">No celular/PWA, tenta enviar todas as fotos anexadas juntas.</div><div className="grid grid-cols-2 gap-2 mt-2"><button onClick={()=>editar(v)} className="h-11 rounded-2xl bg-[#F4F4F0] font-bold flex items-center justify-center gap-2"><Icon name="edit" size={16}/>Editar</button><button onClick={()=>apagar(v.id)} className="h-11 rounded-2xl bg-[#F4F4F0] font-bold flex items-center justify-center gap-2"><Icon name="trash" size={16}/>Apagar</button></div></>}'''
if old_actions in s:
    s=s.replace(old_actions,new_actions,1)
elif 'Reservar / falar no WhatsApp' not in s:
    raise SystemExit('acoes esperadas nao encontradas')

s=s.replace('<article key={v.id} className="bg-white rounded-[24px]','<article id={`veiculo-${v.id}`} key={v.id} className="bg-white rounded-[24px]',1)

marker=" useEffect(()=>{carregar()},[]);useEffect(()=>{carregarMarcas()},[form.categoria]);"
replacement=" useEffect(()=>{carregar()},[]);useEffect(()=>{carregarMarcas()},[form.categoria]);useEffect(()=>{if(CREDITI_MODO_CLIENTE&&!listaLoading){const id=new URLSearchParams(window.location.search).get('veiculo');if(id)setTimeout(()=>document.getElementById(`veiculo-${id}`)?.scrollIntoView({behavior:'smooth',block:'center'}),250)}},[listaLoading]);"
if marker in s and 'scrollIntoView({behavior' not in s[s.find('function App(){'):s.find('async function carregar')]:
    s=s.replace(marker,replacement,1)

p.write_text(s,encoding='utf-8')
print('catalogo publico aplicado')
