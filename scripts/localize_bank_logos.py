from pathlib import Path
from urllib.request import Request, urlopen
import re

LOGOS = {
    'bank-itau.png': 'https://www.google.com/s2/favicons?domain_url=https://www.itau.com.br&sz=128',
    'bank-bradesco.png': 'https://www.google.com/s2/favicons?domain_url=https://banco.bradesco&sz=128',
    'bank-santander.png': 'https://www.google.com/s2/favicons?domain_url=https://www.santander.com.br&sz=128',
    'bank-bv.png': 'https://www.google.com/s2/favicons?domain_url=https://www.bv.com.br&sz=128',
    'bank-pan.png': 'https://www.google.com/s2/favicons?domain_url=https://www.bancopan.com.br&sz=128',
    'bank-safra.png': 'https://www.google.com/s2/favicons?domain_url=https://www.safra.com.br&sz=128',
    'bank-volkswagen.png': 'https://www.google.com/s2/favicons?domain_url=https://www.vwfs.com.br&sz=128',
    'bank-c6.png': 'https://www.google.com/s2/favicons?domain_url=https://www.c6bank.com.br&sz=128',
}

for filename, url in LOGOS.items():
    req = Request(url, headers={'User-Agent': 'Mozilla/5.0 CreditiCatalogo/1.0'})
    with urlopen(req, timeout=30) as r:
        data = r.read()
    if len(data) < 100:
        raise RuntimeError(f'Logo invalida: {filename}')
    Path(filename).write_bytes(data)

p = Path('index.html')
s = p.read_text(encoding='utf-8')
replacements = {
    'https://www.google.com/s2/favicons?domain_url=https://www.itau.com.br&sz=128': '/bank-itau.png',
    'https://www.google.com/s2/favicons?domain_url=https://banco.bradesco&sz=128': '/bank-bradesco.png',
    'https://www.google.com/s2/favicons?domain_url=https://www.santander.com.br&sz=128': '/bank-santander.png',
    'https://www.google.com/s2/favicons?domain_url=https://www.bv.com.br&sz=128': '/bank-bv.png',
    'https://www.google.com/s2/favicons?domain_url=https://www.bancopan.com.br&sz=128': '/bank-pan.png',
    'https://www.google.com/s2/favicons?domain_url=https://www.safra.com.br&sz=128': '/bank-safra.png',
    'https://www.google.com/s2/favicons?domain_url=https://www.vwfs.com.br&sz=128': '/bank-volkswagen.png',
    'https://www.google.com/s2/favicons?domain_url=https://www.c6bank.com.br&sz=128': '/bank-c6.png',
    '/omni-logo-crediti.png?v=1': '/omni-logo-crediti.png',
}
for old, new in replacements.items():
    if old in s:
        s = s.replace(old, new)

preload_paths = [
    '/bank-itau.png','/bank-bradesco.png','/bank-santander.png','/bank-bv.png',
    '/bank-pan.png','/omni-logo-crediti.png','/bank-safra.png','/bank-volkswagen.png','/bank-c6.png'
]
if 'data-crediti-bank-preload="1"' not in s:
    marker = '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-exact-v7.png" />'
    if marker not in s:
        raise RuntimeError('Marcador do head nao encontrado')
    preload = '\n' + '\n'.join(
        f'<link data-crediti-bank-preload="1" rel="preload" as="image" href="{x}" fetchpriority="high" />'
        for x in preload_paths
    )
    s = s.replace(marker, marker + preload, 1)

for path in preload_paths:
    s = s.replace(
        f'src="{path}"',
        f'src="{path}" loading="eager" decoding="async" fetchPriority="high"'
    )

if 'www.google.com/s2/favicons' in s:
    raise RuntimeError('Ainda existem logos externas no index')
p.write_text(s, encoding='utf-8')

sw = Path('sw.js')
t = sw.read_text(encoding='utf-8')
t = re.sub(r"const CORE='catalogo-crediti-v\d+'", "const CORE='catalogo-crediti-v10'", t, count=1)
core = "const CORE_FILES=['/','/index.html','/radio-crediti.js','/manifest.webmanifest','/icon-exact-192-v7.png','/bank-itau.png','/bank-bradesco.png','/bank-santander.png','/bank-bv.png','/bank-pan.png','/omni-logo-crediti.png','/bank-safra.png','/bank-volkswagen.png','/bank-c6.png'];"
t = re.sub(r"const CORE_FILES=\[[^\n]+\];", core, t, count=1)
sw.write_text(t, encoding='utf-8')

print('Logos dos bancos localizadas e pre-carregadas com sucesso.')
