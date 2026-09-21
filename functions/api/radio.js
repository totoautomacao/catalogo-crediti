const STATIONS = [
  {name:'Rádio Clube 105.5 FM',url:'https://8157.brasilstream.com.br/stream'},
  {name:'Antena 1',url:'https://antenaone.crossradio.com.br/stream/1'},
  {name:'Jovem Pan BH',url:'https://8062.brasilstream.com.br/mp3'},
  {name:'Rádio Jangadeiro 88.9 FM',url:'https://stream.zeno.fm/xuh02vfzurhvv'},
  {name:'Classic Pan 76.7 FM',url:'https://stream.zeno.fm/rtk4pzcome3vv'},
  {name:'Jovem Pan FM 100.9',url:'https://stream.zeno.fm/c45wbq2us3buv'}
];

export async function onRequest(context) {
  const request = context.request;
  const reqUrl = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS',
        'Access-Control-Allow-Headers': 'Range,Content-Type',
        'Cache-Control': 'no-store'
      }
    });
  }

  let i = Number(reqUrl.searchParams.get('i') || 0);
  if (!Number.isFinite(i)) i = 0;
  i = ((Math.floor(i) % STATIONS.length) + STATIONS.length) % STATIONS.length;
  const station = STATIONS[i];

  if (reqUrl.searchParams.get('meta') === '1') {
    return Response.json({ok:true,index:i,count:STATIONS.length,name:station.name});
  }

  let upstream;
  try {
    upstream = await fetch(station.url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1 CreditiCatalogo/1.0',
        'Accept': 'audio/mpeg,audio/aac,audio/*;q=0.9,*/*;q=0.5',
        'Icy-MetaData': '0',
        'Cache-Control': 'no-cache'
      },
      cf: {cacheTtl: 0, cacheEverything: false}
    });
  } catch (_) {
    return new Response('Falha ao conectar', {status: 502, headers:{'Cache-Control':'no-store'}});
  }

  if (!upstream || !upstream.ok || !upstream.body) {
    return new Response('Falha ao conectar', {status: 502, headers:{'Cache-Control':'no-store'}});
  }

  let contentType = upstream.headers.get('content-type') || 'audio/mpeg';
  if (!/^audio\//i.test(contentType) && !/octet-stream/i.test(contentType)) contentType = 'audio/mpeg';

  const headers = new Headers();
  headers.set('Content-Type', contentType);
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  headers.set('Pragma', 'no-cache');
  headers.set('Expires', '0');
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
  headers.set('Accept-Ranges', 'none');
  headers.set('X-Crediti-Radio', station.name);
  headers.set('X-Content-Type-Options', 'nosniff');

  return new Response(request.method === 'HEAD' ? null : upstream.body, {
    status: 200,
    headers
  });
}
