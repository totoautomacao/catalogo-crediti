// Compatibility bridge during DNS propagation. The database lives on Hostinger.
export default {
  async fetch(request) {
    const incoming = new URL(request.url);
    const canonical = 'https://catalogo.creditisolucoes.com.br';
    if (incoming.hostname !== 'catalogo.creditisolucoes.com.br') {
      const admin = incoming.hostname === 'catalogo-crediti.pages.dev' &&
        incoming.searchParams.get('cliente') !== '1' &&
        !/^\/(moto|carro|veiculo)\//.test(incoming.pathname);
      const to = new URL(admin ? '/admin' : incoming.pathname, canonical);
      to.search = incoming.search;
      return new Response(null, {status:302, headers:{Location:to.href,'Cache-Control':'no-store'}});
    }
    const upstream = new URL('/catalogo-hostinger' + incoming.pathname + incoming.search, 'https://creditisolucoes.com.br');
    const headers = new Headers(request.headers);
    headers.delete('host');
    const response = await fetch(upstream, {method:request.method,headers,
      body:['GET','HEAD'].includes(request.method)?undefined:request.body,
      redirect:'manual',cache:'no-store'});
    const out = new Headers(response.headers);
    out.set('CDN-Cache-Control','no-store');
    out.set('Cloudflare-CDN-Cache-Control','no-store');
    return new Response(response.body,{status:response.status,headers:out});
  }
};
