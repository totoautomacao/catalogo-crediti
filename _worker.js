export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/instagram/callback') {
      if (request.method !== 'GET') return new Response('Método não permitido', {status:405});
      const target = new URL('https://jfguumxlxmveuszddyky.supabase.co/functions/v1/catalogo-instagram');
      target.searchParams.set('action','callback');
      for (const key of ['code','state','error']) if (url.searchParams.has(key)) target.searchParams.set(key,url.searchParams.get(key));
      const response = await fetch(target,{redirect:'manual',cache:'no-store',credentials:'omit'});
      const location = response.headers.get('Location');
      if (location && /^https:\/\/catalogo-crediti\.pages\.dev\/\?instagram=(connected|cancelled)$/.test(location)) return new Response(null,{status:303,headers:{Location:location,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
      const data = await response.json().catch(()=>({}));
      const message = String(data.error || 'Não foi possível concluir a conexão.').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      return new Response('<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Conectar Instagram</title><body style="font-family:system-ui;max-width:520px;margin:60px auto;padding:24px"><h1>Conectar @crediti.oficial</h1><p>'+message+'</p><a href="https://catalogo-crediti.pages.dev/">Voltar ao catálogo</a></body></html>',{status:response.ok?400:response.status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'"}});
    }

    if (url.pathname === '/api/share-image') {
      const src = url.searchParams.get('src');
      if (!src) return new Response('Imagem não informada', { status: 400 });

      let target;
      try { target = new URL(src); }
      catch (_) { return new Response('URL inválida', { status: 400 }); }

      if (
        target.protocol !== 'https:' ||
        target.hostname !== 'jfguumxlxmveuszddyky.supabase.co' ||
        !target.pathname.startsWith('/storage/v1/object/public/fotos/')
      ) {
        return new Response('Origem não permitida', { status: 403 });
      }

      // Shared images are fetched afresh. Do not read/write edge cache or attach
      // visitor cookies to the image request.

      try {
        const upstream = await fetch(new Request(target.toString(), {
          method: 'GET',
          headers: { 'Accept': 'image/*' },
          cache: 'no-store',
          credentials: 'omit',
          redirect: 'follow'
        }));
        if (!upstream.ok || !upstream.body) {
          return new Response('Imagem indisponível', { status: 502 });
        }

        const type = upstream.headers.get('content-type') || 'image/jpeg';
        if (!type.toLowerCase().startsWith('image/')) {
          return new Response('Arquivo inválido', { status: 502 });
        }

        const headers = new Headers();
        headers.set('Content-Type', type);
        headers.set('Cache-Control', 'no-store, max-age=0');
        headers.set('CDN-Cache-Control', 'no-store');
        headers.set('Cloudflare-CDN-Cache-Control', 'no-store');
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('X-Content-Type-Options', 'nosniff');
        const response = new Response(upstream.body, { status: 200, headers });
        return response;
      } catch (_) {
        return new Response('Imagem indisponível', { status: 502 });
      }
    }

    if (url.pathname === '/api/offline-audio') {
      const src = url.searchParams.get('src');
      if (!src) return new Response('Áudio não informado', { status: 400 });

      let target;
      try { target = new URL(src); }
      catch (_) { return new Response('URL inválida', { status: 400 }); }

      if (
        target.protocol !== 'https:' ||
        target.hostname !== 'en.freepd.cn' ||
        !target.pathname.startsWith('/api/music/')
      ) {
        return new Response('Origem não permitida', { status: 403 });
      }

      const headers = new Headers();
      const range = request.headers.get('range');
      if (range) headers.set('Range', range);

      try {
        const upstream = await fetch(new Request(target.toString(), {
          method: 'GET',
          headers,
          redirect: 'follow'
        }));
        const out = new Headers(upstream.headers);
        out.set('Content-Type', upstream.headers.get('content-type') || 'audio/mpeg');
        out.set('Accept-Ranges', 'bytes');
        out.set('Cache-Control', 'public, max-age=31536000, immutable');
        out.set('Access-Control-Allow-Origin', '*');
        return new Response(upstream.body, {
          status: upstream.status,
          statusText: upstream.statusText,
          headers: out
        });
      } catch (_) {
        return new Response('Áudio indisponível', { status: 502 });
      }
    }

    return env.ASSETS.fetch(request);
  }
};