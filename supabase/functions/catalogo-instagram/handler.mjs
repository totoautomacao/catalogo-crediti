const PROFILE='crediti.oficial';
const ORIGIN='https://catalogo-crediti.pages.dev';
const CALLBACK=ORIGIN+'/api/instagram/callback';
const ADMIN='marcelinoteixeira.santos@gmail.com';
const APP_ID='1346667754213335';
const GRAPH='https://graph.instagram.com/v25.0';
const enc=new TextEncoder();
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b)));
const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const digest=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(s))),n=>n.toString(16).padStart(2,'0')).join('');
class Failure extends Error{constructor(message,status=400){super(message);this.status=status}}
export function createHandler({env,fetch:request,sleep=ms=>new Promise(r=>setTimeout(r,ms)),now=()=>Date.now()}){
 const base=env.SUPABASE_URL,service=env.SUPABASE_SERVICE_ROLE_KEY,secret=env.INSTAGRAM_APP_SECRET;
 async function jsonFetch(url,options={}){const r=await request(url,{...options,signal:AbortSignal.timeout(20000)});let d;try{const text=await r.text();d=text?JSON.parse(text):{}}catch{throw new Failure('O serviço não respondeu corretamente. Tente novamente.',502)}return {r,d}}
 async function db(table,method='GET',body,query=''){
  const {r,d}=await jsonFetch(base+'/rest/v1/'+table+query,{method,headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json',Prefer:'return=representation,resolution=merge-duplicates'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  if(!r.ok)throw new Failure('Não foi possível guardar o andamento. Tente novamente.',503);return d;
 }
 async function crypt(value,decrypt=false){
  const key=await crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',enc.encode(secret+':catalogo-instagram-v1')), 'AES-GCM',false,['encrypt','decrypt']);
  if(decrypt){const [a,b]=value.split('.');return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(a)},key,unb64(b)))}
  const iv=crypto.getRandomValues(new Uint8Array(12));return b64(iv)+'.'+b64(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(value)));
 }
 async function admin(req){
  const authorization=req.headers.get('Authorization')||'';if(!authorization.startsWith('Bearer '))throw new Failure('Entre no catálogo para continuar.',401);
  const {r,d}=await jsonFetch(base+'/auth/v1/user',{headers:{apikey:env.SUPABASE_ANON_KEY||service,Authorization:authorization}});
  if(!r.ok||!d.id||d.email?.toLowerCase()!==ADMIN||!d.email_confirmed_at)throw new Failure('Acesso permitido somente ao administrador do catálogo.',403);return d.id;
 }
 async function graph(path,token,body){
  const {r,d}=await jsonFetch(GRAPH+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  if(!r.ok||d.error){const e=new Failure(d.error?.code===190?'A autorização do Instagram expirou. Conecte novamente.':d.error?.code===10||d.error?.code===200?'O Instagram não liberou a publicação. Autorize novamente o perfil profissional.':'O Instagram recusou esta etapa. Confira o formato das fotos e tente novamente.',502);e.graphCode=d.error?.code;throw e}return d;
 }
 async function connection(){
  const [c]=await db('catalogo_instagram_connection','GET',undefined,'?id=eq.'+PROFILE);if(!c)return null;
  if(Date.parse(c.expires_at)<=now())throw new Failure('A autorização expirou. Conecte o Instagram novamente.',409);
  let token;try{token=await crypt(c.encrypted_token,true)}catch{throw new Failure('Reconecte o Instagram para renovar a autorização.',409)}
  if(Date.parse(c.expires_at)-now()<14*86400000){
   const {r,d}=await jsonFetch('https://graph.instagram.com/refresh_access_token?'+new URLSearchParams({grant_type:'ig_refresh_token',access_token:token}));
   if(r.ok&&d.access_token&&d.expires_in){token=d.access_token;c.encrypted_token=await crypt(token);c.expires_at=new Date(now()+d.expires_in*1000).toISOString();await db('catalogo_instagram_connection','PATCH',{encrypted_token:c.encrypted_token,expires_at:c.expires_at,updated_at:new Date(now()).toISOString()},'?id=eq.'+PROFILE)}
  }
  // Validate the actual token's identity on each use, never a browser-selected username.
  const me=await graph('/me?fields=user_id,username,account_type',token);
  if(me.username?.toLowerCase()!==PROFILE||String(me.user_id||me.id)!==c.instagram_id)throw new Failure('Esta autorização não pertence a @crediti.oficial. Conecte o perfil correto.',409);
  return {...c,token};
 }
 async function callback(req){
  const u=new URL(req.url),state=u.searchParams.get('state')||'';
  if(!/^[a-f0-9]{64}$/.test(state))throw new Failure('Autorização inválida. Comece novamente pelo catálogo.');
  const states=await db('catalogo_instagram_oauth','DELETE',undefined,'?state_hash=eq.'+await digest(state));
  if(!states.length||Date.parse(states[0].expires_at)<now())throw new Failure('Esta autorização expirou. Comece novamente pelo catálogo.');
  if(u.searchParams.get('error'))return Response.redirect(ORIGIN+'/?instagram=cancelled',303);
  const code=u.searchParams.get('code');if(!code)throw new Failure('Código de autorização ausente.');
  const {r,d}=await jsonFetch('https://api.instagram.com/oauth/access_token',{method:'POST',body:new URLSearchParams({client_id:APP_ID,client_secret:secret,grant_type:'authorization_code',redirect_uri:CALLBACK,code})});
  const short=d.data?.[0]||d;
  if(!r.ok||!short.access_token)throw new Failure('O Instagram não concluiu a autorização. Comece novamente.',502);
  const permissions=Array.isArray(short.permissions)?short.permissions:String(short.permissions||'').split(',');
  if(!permissions.includes('instagram_business_content_publish'))throw new Failure('Faltou permitir a publicação. Autorize novamente com essa opção marcada.',403);
  const me=await graph('/me?fields=user_id,username,account_type',short.access_token);
  if(me.username?.toLowerCase()!==PROFILE||!me.user_id&&!me.id)throw new Failure('Conta recusada. O catálogo aceita somente @crediti.oficial.',403);
  const long=await jsonFetch('https://graph.instagram.com/access_token?'+new URLSearchParams({grant_type:'ig_exchange_token',client_secret:secret,access_token:short.access_token}));
  if(!long.r.ok||!long.d.access_token||!long.d.expires_in)throw new Failure('Não foi possível concluir a conexão. Tente novamente.',502);
  await db('catalogo_instagram_connection','POST',{id:PROFILE,instagram_id:String(me.user_id||me.id),encrypted_token:await crypt(long.d.access_token),account_type:me.account_type||'',expires_at:new Date(now()+long.d.expires_in*1000).toISOString(),updated_at:new Date(now()).toISOString()});
  return Response.redirect(ORIGIN+'/?instagram=connected',303);
 }
 const summary=j=>({id:j.id,format:j.format,status:j.status,published:j.items.filter(i=>i.published).length,total:j.items.length,error:j.error||null,profile:PROFILE});
 async function save(j){j.updated_at=new Date(now()).toISOString();await db('catalogo_instagram_jobs','PATCH',{status:j.status,items:j.items,error:j.error,updated_at:j.updated_at,locked_until:new Date(now()+90000).toISOString()},'?id=eq.'+j.id)}
 async function advance(id,owner,c){
  const [j]=await db('rpc/catalogo_instagram_claim','POST',{job_id:id,owner});
  if(!j){const [existing]=await db('catalogo_instagram_jobs','GET',undefined,'?id=eq.'+id+'&owner_id=eq.'+owner);if(!existing)throw new Failure('Publicação não encontrada.',404);return summary(existing)}
  try{
   if(['completed','failed','uncertain'].includes(j.status))return summary(j);
   // A process can stop after calling Meta. Never repeat an uncertain publication.
   if(j.status==='creating'){j.status='failed';j.error='A preparação foi interrompida. Nenhuma publicação foi iniciada. Tente novamente.';await save(j);return summary(j)}
   for(const item of j.items){
    if(item.published)continue;
    let status=await graph('/'+item.container+'?fields=status_code',c.token);
    if(status.status_code==='PUBLISHED'){item.published=true;item.inflight=false;await save(j);continue}
    if(item.inflight){j.status='uncertain';j.error='O Instagram ainda não confirmou o envio. Confira o perfil antes de tentar publicar novamente.';await save(j);return summary(j)}
    if(['ERROR','EXPIRED'].includes(status.status_code)){j.status='failed';j.error='O Instagram não conseguiu preparar uma das fotos. As fotos já publicadas não serão reenviadas.';await save(j);return summary(j)}
    if(status.status_code!=='FINISHED')return summary(j);
    item.inflight=true;await save(j);
    try{const p=await graph('/'+c.instagram_id+'/media_publish',c.token,{creation_id:item.container});if(!p.id)throw new Error('missing id');item.mediaId=p.id;item.published=true;item.inflight=false;await save(j)}catch{j.status='uncertain';j.error='Não foi possível confirmar a publicação. Confira @crediti.oficial antes de repetir.';await save(j);return summary(j)}
   }
   j.status='completed';await save(j);return summary(j);
  }finally{await db('catalogo_instagram_jobs','PATCH',{locked_until:null},'?id=eq.'+id)}
 }
 async function publish(body,owner){
  const {id,vehicleId,photoIds,format}=body;
  if(!/^[0-9a-f-]{36}$/i.test(id||'')||!vehicleId||!Array.isArray(photoIds)||!photoIds.length||photoIds.length>5||new Set(photoIds.map(String)).size!==photoIds.length||!['feed','stories'].includes(format))throw new Failure('Selecione de uma a cinco fotos e escolha Feed ou Stories.');
  const caption=String(body.caption||'');if(caption.length>2200)throw new Failure('A legenda deve ter no máximo 2.200 caracteres.');
  const c=await connection();if(!c)throw new Failure('Conecte @crediti.oficial antes de publicar.',409);
  if(format==='stories'&&c.account_type!=='BUSINESS')throw new Failure('A publicação de Stories exige uma conta empresarial no Instagram.',409);
  const hash=await digest(JSON.stringify({vehicleId,photoIds,format,caption}));
  const [existing]=await db('catalogo_instagram_jobs','GET',undefined,'?id=eq.'+id);
  if(existing){if(existing.owner_id!==owner||existing.payload_hash!==hash)throw new Failure('Esta tentativa já pertence a outra publicação.',409);return advance(id,owner,c)}
  const [vehicle]=await db('veiculos','GET',undefined,'?'+new URLSearchParams({id:'eq.'+vehicleId,select:'id,fotos_veiculo(id,url_foto)'}));
  const photos=photoIds.map(p=>vehicle?.fotos_veiculo?.find(f=>String(f.id)===String(p)));
  if(photos.some(p=>!p))throw new Failure('Uma das fotos não pertence a este veículo. Reabra o compartilhamento.');
  for(const p of photos){const u=new URL(p.url_foto);if(u.origin!==base||!u.pathname.startsWith('/storage/v1/object/public/fotos/'))throw new Failure('Origem da foto não permitida.')}
  const j={id,owner_id:owner,payload_hash:hash,format,status:'creating',items:[],error:null,locked_until:new Date(now()+90000).toISOString()};
  // Insert without upsert: duplicate idempotency keys must not replace another request.
  const inserted=await jsonFetch(base+'/rest/v1/catalogo_instagram_jobs',{method:'POST',headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'},body:JSON.stringify(j)});
  if(!inserted.r.ok)throw new Failure('Esta tentativa já está em andamento. Aguarde a confirmação.',409);
  try{
   const children=[];
   for(const p of photos){
    const d=await graph('/'+c.instagram_id+'/media',c.token,{image_url:p.url_foto,...(format==='stories'?{media_type:'STORIES'}:photos.length>1?{is_carousel_item:true}:{caption})});
    if(!d.id)throw new Failure('O Instagram não confirmou a preparação da foto.',502);
    children.push(d.id);await save(j);if(format==='stories'||photos.length===1)j.items.push({container:d.id,published:false,inflight:false});
   }
   if(format==='feed'&&children.length>1){const d=await graph('/'+c.instagram_id+'/media',c.token,{media_type:'CAROUSEL',children,caption});if(!d.id)throw new Failure('O Instagram não confirmou o carrossel.',502);j.items.push({container:d.id,published:false,inflight:false})}
   j.status='processing';await save(j);
  }catch(e){j.status='failed';j.error=e instanceof Failure?e.message:'A preparação foi interrompida. Tente novamente.';await save(j)}
  finally{await db('catalogo_instagram_jobs','PATCH',{locked_until:null},'?id=eq.'+id)}
  if(j.status==='failed')return summary(j);return advance(id,owner,c);
 }
 return async req=>{
  const origin=req.headers.get('Origin');const headers={'Content-Type':'application/json','Cache-Control':'no-store','Referrer-Policy':'no-referrer',...(origin===ORIGIN?{'Access-Control-Allow-Origin':ORIGIN,'Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'GET,POST,OPTIONS'}:{})};
  const reply=(d,status=200)=>new Response(JSON.stringify(d),{status,headers});
  try{
   if(origin&&origin!==ORIGIN)throw new Failure('Origem não permitida.',403);
   if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
   const action=new URL(req.url).searchParams.get('action')||'status';
   if(action==='health')return reply({ok:true,configured:!!secret,profile:PROFILE});
   if(!secret)throw new Failure('A conexão está sendo configurada. A chave do aplicativo ainda precisa ser cadastrada no servidor.',503);
   if(action==='callback'&&req.method==='GET')return await callback(req);
   const owner=await admin(req);
   if(action==='status'&&req.method==='GET'){const c=await connection();return reply({profile:PROFILE,connected:!!c,stories:!!c&&c.account_type==='BUSINESS',expiresAt:c?.expires_at||null})}
   if(action==='connect'&&req.method==='POST'){
    const state=Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
    await db('catalogo_instagram_oauth','DELETE',undefined,'?expires_at=lt.'+encodeURIComponent(new Date(now()).toISOString()));
    await db('catalogo_instagram_oauth','POST',{state_hash:await digest(state),owner_id:owner,expires_at:new Date(now()+600000).toISOString()});
    return reply({url:'https://www.instagram.com/oauth/authorize?'+new URLSearchParams({client_id:APP_ID,redirect_uri:CALLBACK,response_type:'code',scope:'instagram_business_basic,instagram_business_content_publish',state,force_reauth:'true',enable_fb_login:'false'})});
   }
   if(action==='publish'&&req.method==='POST')return reply(await publish(await req.json(),owner));
   if(action==='job'&&req.method==='GET'){const id=new URL(req.url).searchParams.get('id');if(!/^[0-9a-f-]{36}$/i.test(id||''))throw new Failure('Publicação inválida.');const c=await connection();if(!c)throw new Failure('Conecte o perfil novamente.',409);return reply(await advance(id,owner,c))}
   throw new Failure('Operação não encontrada.',404);
  }catch(e){return reply({error:e instanceof Failure?e.message:'Não foi possível concluir esta etapa. Tente novamente.'},e instanceof Failure?e.status:500)}
 };
}
