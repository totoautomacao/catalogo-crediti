const API_HOSTS = [
  'https://all.api.radio-browser.info',
  'https://de1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
  'https://at1.api.radio-browser.info'
];

async function getStations() {
  const cache = caches.default;
  const cacheKey = new Request('https://crediti.internal/radio-stations-v1');
  const cached = await cache.match(cacheKey);
  if (cached) return cached.json();

  const path = '/json/stations/search?countrycode=BR&hidebroken=true&is_https=true&order=votes&reverse=true&limit=120';
  let data = [];
  for (const host of API_HOSTS) {
    try {
      const r = await fetch(host + path, { headers: { 'User-Agent': 'CreditiCatalogo/1.0' } });
      if (!r.ok) continue;
      const j = await r.json();
      if (Array.isArray(j) && j.length) { data = j; break; }
    } catch (_) {}
  }

  const bad = ['news','noticia','notícia','talk','jornal','sports','esporte','podcast'];
  const good = ['sertanejo','forro','forró','pop','rock','romant','mpb','flashback','dance','hits','eclet','eclectic','varied','variad','musica','música'];
  const stations = data.filter(s => {
    const u = String(s.url_resolved || s.url || '').trim();
    const c = String(s.codec || '').toLowerCase();
    const b = Number(s.bitrate || 0);
    return u.startsWith('https://') && !/(m3u8|hls)/i.test(u) && c === 'mp3' && b >= 128 && b <= 320;
  }).map(s => {
    const txt = `${s.name || ''} ${s.tags || ''}`.toLowerCase();
    let score = good.reduce((n,g)=>n+(txt.includes(g)?1:0),0)*120 + Math.log1p(Number(s.votes)||0)*14 + Math.min(80,(Number(s.bitrate)||0)/3);
    if (txt.includes('variety') || txt.includes('variad') || txt.includes('eclet')) score += 220;
    if (txt.includes('hits') || txt.includes('music') || txt.includes('musica') || txt.includes('música')) score += 70;
    bad.forEach(k=>{ if(txt.includes(k)) score -= 180; });
    return { name:s.name || 'Rádio online', url:String(s.url_resolved || s.url || '').trim(), bitrate:Number(s.bitrate||0), score };
  }).sort((a,b)=>b.score-a.score).slice(0,30);

  const response = new Response(JSON.stringify(stations), {
    headers: { 'Content-Type':'application/json', 'Cache-Control':'public, max-age=600' }
  });
  await cache.put(cacheKey, response.clone());
  return stations;
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const stations = await getStations();
  if (!stations.length) return new Response('Rádio indisponível', { status: 503 });

  let i = Number(url.searchParams.get('i') || 0);
  if (!Number.isFinite(i)) i = 0;
  i = ((Math.floor(i) % stations.length) + stations.length) % stations.length;
  const station = stations[i];

  if (url.searchParams.get('meta') === '1') {
    return Response.json({ ok:true, index:i, count:stations.length, name:station.name, bitrate:station.bitrate });
  }

  let upstream;
  try {
    upstream = await fetch(station.url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 CreditiCatalogo/1.0',
        'Accept': 'audio/mpeg,audio/*;q=0.9,*/*;q=0.5',
        'Icy-MetaData': '0'
      }
    });
  } catch (_) {
    return new Response('Falha ao abrir rádio', { status: 502 });
  }
  if (!upstream.ok || !upstream.body) return new Response('Falha ao abrir rádio', { status: 502 });

  const headers = new Headers();
  headers.set('Content-Type', upstream.headers.get('Content-Type') || 'audio/mpeg');
  headers.set('Cache-Control', 'no-store');
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
  headers.set('X-Crediti-Radio', station.name);
  return new Response(upstream.body, { status:200, headers });
}
