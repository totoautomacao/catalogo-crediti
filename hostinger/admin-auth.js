(()=>{
 if(window.__creditiAdminAuth)return;window.__creditiAdminAuth=true;
 const client=new URLSearchParams(location.search).get('cliente')==='1';
 const nativeFetch=window.fetch.bind(window);let current=null,resolveReady;
 const ready=new Promise(r=>resolveReady=r);window.__CREDITI_ADMIN_READY__=ready;
 const style=document.createElement('style');style.textContent=`
html.crediti-admin-locked #root{visibility:hidden!important}
#crediti-admin-login{position:fixed;inset:0;z-index:999999;overflow-y:auto;display:flex;align-items:center;justify-content:center;padding:24px 18px;background:#18201e;font-family:Inter,system-ui,-apple-system,sans-serif;color:#151819;isolation:isolate}
#crediti-admin-login::before{content:"";position:fixed;inset:-8px;background:linear-gradient(180deg,rgba(12,20,20,.43),rgba(12,20,20,.76)),url('/login-patio-v44.jpg') center/cover no-repeat;filter:blur(3px);z-index:-1;pointer-events:none}
#crediti-admin-login *{box-sizing:border-box}
#crediti-admin-login .ca-box{width:min(420px,100%);flex-shrink:0;margin:auto;background:#fff;border:1px solid #ffffff55;border-radius:24px;overflow:hidden;box-shadow:0 22px 80px #0005}
#crediti-admin-login .ca-hero{position:relative;height:200px;background:#293431;overflow:hidden}
#crediti-admin-login .ca-hero img{width:100%;height:100%;object-fit:cover;object-position:center 54%;display:block}
#crediti-admin-login .ca-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,#0007,transparent 45%);pointer-events:none}
#crediti-admin-login .ca-brand{position:absolute;top:19px;left:24px;z-index:1;font-family:Montserrat,Inter,system-ui,sans-serif;font-size:27px;font-weight:850;letter-spacing:-1.1px;color:#fff;line-height:1}
#crediti-admin-login .ca-content{padding:27px 28px 25px}
#crediti-admin-login .ca-eyebrow{display:flex;align-items:center;gap:7px;font-size:10px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;color:#666d6b}
#crediti-admin-login .ca-eyebrow::before{content:"";width:6px;height:6px;border-radius:50%;background:#FDCA01}
#crediti-admin-login h1{font-size:28px;font-weight:850;line-height:1.15;letter-spacing:-.9px;margin:10px 0 9px}
#crediti-admin-login p{color:#6c716f;font-size:13px;line-height:1.6;margin:0 0 22px}
#crediti-admin-login label{display:block;font-weight:750;font-size:12px}
#crediti-admin-login input{display:block;width:100%;height:52px;border:1px solid #dce0dc;border-radius:12px;background:#f8f9f6;color:#151819;padding:0 15px;font-size:16px;margin-top:8px;outline:none;transition:border-color .15s,box-shadow .15s}
#crediti-admin-login input:focus{border-color:#a78000;box-shadow:0 0 0 3px #FDCA0140;background:white}
#crediti-admin-login button{display:flex;align-items:center;justify-content:center;gap:12px;width:100%;height:52px;border:0;border-radius:12px;margin-top:14px;background:#FDCA01;color:#111;font-size:14px;font-weight:800;cursor:pointer;touch-action:manipulation}
#crediti-admin-login button:hover{background:#eebe00}
#crediti-admin-login button:focus-visible{outline:3px solid #151819;outline-offset:3px}
#crediti-admin-login button:disabled{opacity:.55;cursor:wait}
#crediti-admin-login button svg{width:18px;height:18px}
#crediti-admin-login .ca-error{color:#a21b1b;font-size:12px;line-height:1.5;margin-top:12px}
#crediti-admin-login .ca-error:empty{display:none}
#crediti-admin-login .ca-footer{border-top:1px solid #eceee8;margin-top:22px;padding-top:15px;display:flex;align-items:center;justify-content:center;gap:6px;color:#858b86;font-size:10px}
#crediti-admin-login .ca-footer svg{width:12px;height:12px}
#crediti-admin-tools{position:fixed;right:12px;bottom:12px;z-index:100;display:flex;gap:8px;font:12px system-ui}
#crediti-admin-tools button,#crediti-admin-tools a{border:1px solid #ddd;border-radius:12px;background:#fff;color:#111;padding:10px;text-decoration:none;box-shadow:0 2px 8px #0001}
@media(max-width:480px){#crediti-admin-login{padding:max(18px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(18px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left))}#crediti-admin-login .ca-hero{height:auto;aspect-ratio:2/1}#crediti-admin-login .ca-content{padding:24px}#crediti-admin-login h1{font-size:27px}}
@media(max-height:620px){#crediti-admin-login{align-items:flex-start}#crediti-admin-login .ca-hero{height:140px;aspect-ratio:auto}#crediti-admin-login .ca-content{padding:20px 24px}#crediti-admin-login p{margin-bottom:15px}#crediti-admin-login .ca-footer{margin-top:17px}}
`;document.head.appendChild(style);
 function unlocked(){document.getElementById('crediti-admin-login')?.remove();document.documentElement.classList.remove('crediti-admin-locked');resolveReady(current);if(!document.getElementById('crediti-admin-tools')){const t=document.createElement('div');t.id='crediti-admin-tools';t.innerHTML='<a href="/backend/backup" download>Cópia dos dados</a><button type="button">Sair</button>';t.querySelector('button').onclick=()=>window.CreditiAdminAuth.logout();document.body.appendChild(t);}}
 async function call(path,body){const r=await nativeFetch('/backend/auth/'+path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json',...(current?.csrf?{'X-Crediti-CSRF':current.csrf}:{})},...(body?{body:JSON.stringify(body)}:{})});const d=await r.json();if(!r.ok)throw new Error(d.message||'Não foi possível entrar.');return d;}
 function login(){document.documentElement.classList.add('crediti-admin-locked');if(document.getElementById('crediti-admin-login'))return;const box=document.createElement('div');box.id='crediti-admin-login';box.innerHTML=`<div class="ca-box"><div class="ca-hero"><img src="/login-patio-v44.jpg" alt="Carro e moto em destaque em um pátio de veículos" fetchpriority="high" width="1280" height="853"><div class="ca-brand">Crediti</div></div><div class="ca-content"><div class="ca-eyebrow">Área do administrador</div><h1>Seu catálogo.<br>Novas oportunidades.</h1><p>Entre para gerenciar seus carros e motos.</p><form><label for="crediti-admin-password">Senha de acesso</label><input id="crediti-admin-password" type="password" autocomplete="current-password" required placeholder="Digite sua senha" aria-describedby="crediti-login-error"><button type="submit"><span>Entrar no catálogo</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></button><div id="crediti-login-error" class="ca-error" role="alert"></div></form><div class="ca-footer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>Acesso exclusivo da equipe Crediti</div></div></div>`;document.body.appendChild(box);const f=box.querySelector('form'),b=box.querySelector('button'),input=box.querySelector('input'),err=box.querySelector('.ca-error');f.onsubmit=async e=>{e.preventDefault();b.disabled=true;err.textContent='';try{current=await call('login',{password:input.value});input.value='';unlocked();}catch(e){err.textContent=e.message;}finally{b.disabled=false;}};}
 window.fetch=async(input,init={})=>{
  const u=new URL(typeof input==='string'?input:input.url,location.href);
  if(u.origin!==location.origin||!u.pathname.startsWith('/backend/')||u.pathname.startsWith('/backend/auth/'))return nativeFetch(input,init);
  if(!client)await ready;
  const headers=new Headers(input instanceof Request?input.headers:undefined);new Headers(init.headers).forEach((v,k)=>headers.set(k,v));if(current?.csrf)headers.set('X-Crediti-CSRF',current.csrf);
  // Hostinger CDN treats a route ending in .jpg as a static file. Send uploads
  // through the explicit PHP endpoint so they reach authentication and GD.
  let target=input;if(u.pathname.startsWith('/backend/storage/v1/object/fotos/')){const direct=new URL('/api.php',location.origin);direct.searchParams.set('route',u.pathname.slice('/backend/'.length));u.searchParams.forEach((v,k)=>direct.searchParams.set(k,v));target=input instanceof Request?new Request(direct.href,input):direct.href;}
  const r=await nativeFetch(target,{...init,headers,credentials:'same-origin',cache:'no-store'});
  if(r.status===401&&!client){current=null;login();}return r;
 };
 window.CreditiAdminAuth={async logout(){try{await call('logout',{});}finally{current=null;try{indexedDB.deleteDatabase('crediti-catalogo-hostinger-v42')}catch{}for(const k of ['crediti_admin_session_v1','crediti_catalogo_admin_v1','crediti_catalogo_cache_v1'])localStorage.removeItem(k);location.replace('/admin');}}};
 if(client){resolveReady(null);return;}
 document.documentElement.classList.add('crediti-admin-locked');
 call('session').then(s=>{if(s.authenticated){current=s;unlocked();}else login();}).catch(()=>login());
})();
