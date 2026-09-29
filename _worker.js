export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

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

      const cache = caches.default;
      const cacheKey = new Request(url.toString(), { method: 'GET' });
      const cached = await cache.match(cacheKey);
      if (cached) return cached;

      try {
        const upstream = await fetch(new Request(target.toString(), {
          method: 'GET',
          headers: { 'Accept': 'image/*' },
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
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        headers.set('CDN-Cache-Control', 'public, max-age=31536000, immutable');
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('X-Content-Type-Options', 'nosniff');
        const response = new Response(upstream.body, { status: 200, headers });
        ctx?.waitUntil(cache.put(cacheKey, response.clone()));
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