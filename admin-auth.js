(()=> {
  if (window.__creditiAdminAuth) return;
  window.__creditiAdminAuth = true;

  const SUPABASE_URL = 'https://jfguumxlxmveuszddyky.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_F84YmaFbhJGUmNXYrye1Rw_h6xKvW3B';
  const ADMIN_EMAIL = 'marcelinoteixeira.santos@gmail.com';
  const SESSION_KEY = 'crediti_admin_session_v1';
  const params = new URLSearchParams(location.search);
  const isClient = params.get('cliente') === '1';

  if (isClient) {
    window.__CREDITI_ADMIN_READY__ = Promise.resolve(null);
    return;
  }

  const nativeFetch = window.fetch.bind(window);
  let session = null;
  let refreshPromise = null;
  let readyResolve;
  let readyDone = false;
  const ready = new Promise(resolve => { readyResolve = resolve; });
  window.__CREDITI_ADMIN_READY__ = ready;

  function finishReady(value) {
    if (readyDone) return;
    readyDone = true;
    readyResolve(value);
  }

  function readSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && parsed.access_token ? parsed : null;
    } catch {
      return null;
    }
  }

  function saveSession(next) {
    session = next;
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    } catch {}
  }

  function clearSession() {
    session = null;
    try { localStorage.removeItem(SESSION_KEY); } catch {}
  }

  function isFresh(s) {
    const exp = Number(s?.expires_at || 0);
    return !!s?.access_token && exp * 1000 > Date.now() + 60_000;
  }

  async function authRequest(path, body) {
    const response = await nativeFetch(SUPABASE_URL + path, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      cache: 'no-store'
    });
    let data = null;
    try { data = await response.json(); } catch {}
    if (!response.ok) {
      const error = new Error(data?.msg || data?.error_description || data?.message || 'Falha na autenticação');
      error.status = response.status;
      throw error;
    }
    return data;
  }

  async function refreshSession() {
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async () => {
      if (!session?.refresh_token) throw new Error('Sessão expirada');
      const data = await authRequest('/auth/v1/token?grant_type=refresh_token', {
        refresh_token: session.refresh_token
      });
      const next = {
        access_token: data.access_token,
        refresh_token: data.refresh_token || session.refresh_token,
        expires_in: data.expires_in,
        expires_at: data.expires_at || Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600),
        token_type: data.token_type || 'bearer',
        user: data.user || session.user || null
      };
      saveSession(next);
      return next;
    })().finally(() => { refreshPromise = null; });
    return refreshPromise;
  }

  async function getAccessToken() {
    if (isFresh(session)) return session.access_token;
    if (session?.refresh_token) {
      try {
        const next = await refreshSession();
        return next.access_token;
      } catch {
        clearSession();
        showLogin();
      }
    }
    await ready;
    if (!session?.access_token) throw new Error('Administrador não autenticado');
    if (!isFresh(session) && session.refresh_token) {
      const next = await refreshSession();
      return next.access_token;
    }
    return session.access_token;
  }

  function lockRoot(on) {
    document.documentElement.classList.toggle('crediti-admin-locked', on);
    if (!document.getElementById('crediti-admin-auth-style')) {
      const style = document.createElement('style');
      style.id = 'crediti-admin-auth-style';
      style.textContent = `
html.crediti-admin-locked,html.crediti-admin-locked body{overflow:hidden!important}
html.crediti-admin-locked #root{visibility:hidden!important}
#crediti-admin-login{position:fixed;inset:0;z-index:999999;background:#F5F6F2;display:flex;align-items:center;justify-content:center;padding:22px;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
#crediti-admin-login .ca-box{width:min(390px,100%);background:#fff;border:1px solid rgba(0,0,0,.07);border-radius:28px;padding:24px;box-shadow:0 18px 60px rgba(0,0,0,.10)}
#crediti-admin-login .ca-logo{width:58px;height:58px;border-radius:18px;background:#FDCA01;display:flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:16px}
#crediti-admin-login h1{margin:0;font-size:26px;line-height:1.05;font-weight:900;color:#111}
#crediti-admin-login p{margin:8px 0 18px;color:#666;font-size:14px;line-height:1.4}
#crediti-admin-login label{display:block;font-weight:800;font-size:13px;margin-bottom:7px}
#crediti-admin-login input{width:100%;height:54px;border:1px solid #deded8;border-radius:16px;padding:0 16px;font-size:18px;outline:none;background:#fff}
#crediti-admin-login input:focus{border-color:#111;box-shadow:0 0 0 4px rgba(0,0,0,.06)}
#crediti-admin-login button{width:100%;height:54px;border:0;border-radius:16px;margin-top:12px;background:#111;color:#fff;font-size:16px;font-weight:900}
#crediti-admin-login button:disabled{opacity:.55}
#crediti-admin-login .ca-error{display:none;margin-top:11px;padding:10px 12px;border-radius:12px;background:#fff0f0;color:#9f1717;font-size:12px;font-weight:800}
#crediti-admin-login .ca-note{margin-top:12px;text-align:center;color:#8a8a84;font-size:11px;line-height:1.35}
      `;
      document.head.appendChild(style);
    }
  }

  function removeLogin() {
    document.getElementById('crediti-admin-login')?.remove();
    lockRoot(false);
  }

  function showLogin() {
    lockRoot(true);
    if (document.getElementById('crediti-admin-login')) return;
    const overlay = document.createElement('div');
    overlay.id = 'crediti-admin-login';
    overlay.innerHTML = `
      <div class="ca-box">
        <div class="ca-logo">🚗</div>
        <h1>Catálogo Crediti</h1>
        <p>Acesso do administrador. Digite somente a senha para continuar.</p>
        <form id="crediti-admin-login-form">
          <label for="crediti-admin-password">Senha</label>
          <input id="crediti-admin-password" type="password" autocomplete="current-password" placeholder="Digite a senha" required />
          <button id="crediti-admin-login-button" type="submit">Entrar</button>
          <div id="crediti-admin-login-error" class="ca-error"></div>
        </form>
        <div class="ca-note">Após entrar, este aparelho permanece autorizado até a sessão ser encerrada ou os dados do navegador serem apagados.</div>
      </div>
    `;
    document.body.appendChild(overlay);
    const form = overlay.querySelector('#crediti-admin-login-form');
    const input = overlay.querySelector('#crediti-admin-password');
    const button = overlay.querySelector('#crediti-admin-login-button');
    const errorBox = overlay.querySelector('#crediti-admin-login-error');
    setTimeout(() => input?.focus(), 80);

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const password = String(input.value || '');
      if (!password) return;
      button.disabled = true;
      button.textContent = 'Entrando...';
      errorBox.style.display = 'none';
      try {
        const data = await authRequest('/auth/v1/token?grant_type=password', {
          email: ADMIN_EMAIL,
          password
        });
        const next = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_in: data.expires_in,
          expires_at: data.expires_at || Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600),
          token_type: data.token_type || 'bearer',
          user: data.user || null
        };
        saveSession(next);
        removeLogin();
        finishReady(next);
      } catch (err) {
        clearSession();
        errorBox.textContent = 'Senha incorreta. Confira e tente novamente.';
        errorBox.style.display = 'block';
        input.select();
      } finally {
        button.disabled = false;
        button.textContent = 'Entrar';
      }
    });
  }

  async function authFetch(input, init = undefined) {
    let url;
    try {
      url = new URL(typeof input === 'string' ? input : input.url, location.href);
    } catch {
      return nativeFetch(input, init);
    }
    const protectedRequest =
      url.hostname === 'jfguumxlxmveuszddyky.supabase.co' &&
      !url.pathname.startsWith('/auth/v1/');

    if (!protectedRequest) return nativeFetch(input, init);

    const accessToken = await getAccessToken();
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
    headers.set('Authorization', 'Bearer ' + accessToken);
    if (!headers.has('apikey')) headers.set('apikey', SUPABASE_KEY);

    let response;
    if (input instanceof Request) {
      response = await nativeFetch(new Request(input, { ...init, headers }));
    } else {
      response = await nativeFetch(input, { ...(init || {}), headers });
    }

    if (response.status !== 401 || !session?.refresh_token) return response;

    try {
      await refreshSession();
      const retryHeaders = new Headers(headers);
      retryHeaders.set('Authorization', 'Bearer ' + session.access_token);
      if (input instanceof Request) {
        return nativeFetch(new Request(input, { ...init, headers: retryHeaders }));
      }
      return nativeFetch(input, { ...(init || {}), headers: retryHeaders });
    } catch {
      clearSession();
      showLogin();
      return response;
    }
  }

  window.fetch = authFetch;
  window.CreditiAdminAuth = {
    async logout() {
      try {
        if (session?.access_token) {
          await nativeFetch(SUPABASE_URL + '/auth/v1/logout', {
            method: 'POST',
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: 'Bearer ' + session.access_token
            }
          });
        }
      } catch {}
      clearSession();
      location.reload();
    }
  };

  session = readSession();
  if (isFresh(session)) {
    removeLogin();
    finishReady(session);
  } else if (session?.refresh_token) {
    lockRoot(true);
    refreshSession()
      .then(next => {
        removeLogin();
        finishReady(next);
      })
      .catch(() => {
        clearSession();
        showLogin();
      });
  } else {
    showLogin();
  }
})();