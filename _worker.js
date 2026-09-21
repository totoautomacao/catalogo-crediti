export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Proxy somente das faixas CC0 usadas pela playlist offline da Rádio Crediti.
    // O áudio fica no mesmo domínio do catálogo, permitindo cache real e reprodução
    // offline no Safari/iPhone, Android e desktop.
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

    // Todos os demais arquivos, inclusive sw.js, manifests e ícones,
    // são servidos diretamente do projeto. Não substituir o service worker aqui.
    return env.ASSETS.fetch(request);
  }
};
