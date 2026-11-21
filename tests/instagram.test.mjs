import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../supabase/functions/catalogo-instagram/handler.mjs';
const ORIGIN='https://catalogo-crediti.pages.dev',BASE='https://jfguumxlxmveuszddyky.supabase.co';
function fixture(){
 const tables={catalogo_instagram_oauth:[],catalogo_instagram_connection:[],catalogo_instagram_jobs:[],veiculos:[{id:'car',fotos_veiculo:[{id:1,url_foto:BASE+'/storage/v1/object/public/fotos/car1.jpg'},{id:2,url_foto:BASE+'/storage/v1/object/public/fotos/car2.jpg'}]}]};
 const controls={username:'crediti.oficial',permission:true,publications:0,containers:0,timeout:false,status:'FINISHED',admin:true};
 const json=(d,status=200)=>new Response(JSON.stringify(d),{status});
 const fetch=async(url,options={})=>{
  const u=new URL(url),m=options.method||'GET',body=options.body?JSON.parse(typeof options.body==='string'?options.body:'{}'):undefined;
  if(u.pathname==='/auth/v1/user')return json(controls.admin?{id:'admin-uuid',email:'marcelinoteixeira.santos@gmail.com',email_confirmed_at:'today'}:{id:'other',email:'other@example.com',email_confirmed_at:'today'});
  if(u.pathname.startsWith('/rest/v1/')){
   const table=u.pathname.slice(9);
   if(table==='rpc/catalogo_instagram_claim'){const j=tables.catalogo_instagram_jobs.find(x=>x.id===body.job_id&&x.owner_id===body.owner);if(!j||j.locked_until&&Date.parse(j.locked_until)>Date.now())return json([]);j.locked_until=new Date(Date.now()+90000).toISOString();return json([structuredClone(j)])}
   let rows=tables[table];assert(rows,'table '+table);
   const selected=()=>rows.filter(row=>[...u.searchParams].filter(([k])=>k!=='select').every(([k,v])=>v.startsWith('eq.')?String(row[k])===v.slice(3):v.startsWith('lt.')?String(row[k])<v.slice(3):false));
   if(m==='GET')return json(structuredClone(selected()));
   if(m==='DELETE'){const match=selected();tables[table]=rows.filter(x=>!match.includes(x));return json(structuredClone(match))}
   if(m==='PATCH'){const match=selected();match.forEach(x=>Object.assign(x,body));return json(structuredClone(match))}
   if(m==='POST'){const existing=rows.find(x=>body.id?x.id===body.id:x.state_hash===body.state_hash);if(existing&&table==='catalogo_instagram_jobs')return json({},409);if(existing)Object.assign(existing,body);else rows.push(structuredClone(body));return json([body])}
  }
  if(u.hostname==='api.instagram.com')return json({data:[{access_token:'SHORT_TEST_TOKEN',permissions:controls.permission?'instagram_business_basic,instagram_business_content_publish':'instagram_business_basic'}]});
  if(u.pathname==='/access_token')return json({access_token:'LONG_TEST_TOKEN',expires_in:5184000});
  if(u.pathname.endsWith('/me'))return json({user_id:'official-id',username:controls.username,account_type:'BUSINESS'});
  if(u.pathname.endsWith('/media')){controls.containers++;return json({id:'container'+controls.containers})}
  if(u.pathname.endsWith('/media_publish')){controls.publications++;if(controls.timeout)throw Error('network interrupted');return json({id:'media'+controls.publications})}
  if(u.pathname.includes('/container'))return json({status_code:controls.status});
  throw Error('unexpected '+u.pathname);
 };
 const handler=createHandler({env:{SUPABASE_URL:BASE,SUPABASE_SERVICE_ROLE_KEY:'SERVER_TEST_KEY',INSTAGRAM_APP_SECRET:'TEST_ONLY_SECRET'},fetch});
 async function call(action,body,auth=true,origin=ORIGIN){return handler(new Request(BASE+'/functions/v1/catalogo-instagram?'+action,{method:body?'POST':'GET',headers:{...(origin?{Origin:origin}:{}),...(auth?{Authorization:'Bearer USER_TEST_JWT'}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}))}
 async function connect(){const r=await call('action=connect',{});assert.equal(r.status,200);const {url}=await r.json();const state=new URL(url).searchParams.get('state');return call('action=callback&code=TEST_CODE&state='+state,undefined,false,null)}
 return {tables,controls,call,connect};
}
test('authentication and origin checks protect connection',async()=>{const f=fixture();assert.equal((await f.call('action=connect',{},false)).status,401);assert.equal((await f.call('action=connect',{},true,'https://evil.example')).status,403);f.controls.admin=false;assert.equal((await f.call('action=connect',{})).status,403);assert.equal(f.tables.catalogo_instagram_oauth.length,0)});
test('OAuth accepts only the official account and publication permission',async()=>{const f=fixture();f.controls.username='personal';assert.equal((await f.connect()).status,403);assert.equal(f.tables.catalogo_instagram_connection.length,0);f.controls.username='crediti.oficial';f.controls.permission=false;assert.equal((await f.connect()).status,403);assert.equal(f.tables.catalogo_instagram_connection.length,0)});
test('OAuth state is one-time and token stays encrypted',async()=>{const f=fixture();const r=await f.call('action=connect',{}),{url}=await r.json(),state=new URL(url).searchParams.get('state');assert(!JSON.stringify(f.tables).includes(state));const query='action=callback&code=CODE&state='+state;assert.equal((await f.call(query,undefined,false,null)).status,303);assert.equal((await f.call(query,undefined,false,null)).status,400);assert(!JSON.stringify(f.tables).includes('LONG_TEST_TOKEN'));const status=await (await f.call('action=status')).json();assert.equal(status.connected,true);assert(!JSON.stringify(status).includes('encrypted_token'))});
const payload=(id=crypto.randomUUID())=>({id,vehicleId:'car',photoIds:[1,2],format:'feed',caption:'Veículo Crediti'});
test('carousel publishes once and repeat request reuses its result',async()=>{const f=fixture();await f.connect();const body=payload();let r=await f.call('action=publish',body);assert.equal(r.status,200);assert.equal((await r.json()).status,'completed');assert.equal(f.controls.containers,3);assert.equal(f.controls.publications,1);r=await f.call('action=publish',body);assert.equal((await r.json()).status,'completed');assert.equal(f.controls.publications,1);assert.equal((await f.call('action=publish',{...body,caption:'changed'})).status,409)});
test('photos must belong to selected vehicle and account identity is rechecked',async()=>{const f=fixture();await f.connect();assert.equal((await f.call('action=publish',{...payload(),photoIds:[9]})).status,400);assert.equal(f.controls.containers,0);f.controls.username='personal';assert.equal((await f.call('action=publish',payload())).status,409);assert.equal(f.controls.publications,0)});
test('uncertain publish is never automatically repeated',async()=>{const f=fixture();await f.connect();f.controls.timeout=true;const body=payload();let r=await f.call('action=publish',body);assert.equal((await r.json()).status,'uncertain');assert.equal(f.controls.publications,1);r=await f.call('action=job&id='+body.id);assert.equal((await r.json()).status,'uncertain');assert.equal(f.controls.publications,1)});
test('stories publish separately; pending containers are polled safely',async()=>{const f=fixture();await f.connect();f.controls.status='IN_PROGRESS';const body={...payload(),format:'stories'};let r=await f.call('action=publish',body);assert.equal((await r.json()).status,'processing');assert.equal(f.controls.publications,0);f.controls.status='FINISHED';r=await f.call('action=job&id='+body.id);const d=await r.json();assert.equal(d.status,'completed');assert.equal(d.published,2);assert.equal(f.controls.publications,2)});
test('expired OAuth state is rejected without saving authorization',async()=>{const f=fixture();const r=await f.call('action=connect',{}),{url}=await r.json(),state=new URL(url).searchParams.get('state');f.tables.catalogo_instagram_oauth[0].expires_at='2000-01-01T00:00:00Z';assert.equal((await f.call('action=callback&code=CODE&state='+state,undefined,false,null)).status,400);assert.equal(f.tables.catalogo_instagram_connection.length,0)});
