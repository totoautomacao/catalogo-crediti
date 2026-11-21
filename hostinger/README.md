# Catálogo Crediti na Hostinger

PHP 8.2 com SQLite3, GD e cURL. O catálogo público e o administrador `/admin`
usam o mesmo banco. O plano existente não precisa de outro banco MySQL.

## Publicação

`python3 hostinger/build.py /caminho/backup /caminho/release`

O backup privado contém `backup.json`, `admin.json` e `media/`. Nunca enviar
esses arquivos ao Git. A saída contém `seed.php`, protegido pelo PHP e pelo
`.htaccess`. No primeiro acesso, o banco é instalado fora de `public_html`,
em `domains/creditisolucoes.com.br/.catalogo-data/catalogo.sqlite`.

Atualizações de código não substituem o banco já instalado. Guardar também
`media/`, o banco SQLite e as configurações privadas em qualquer backup.
Snapshots do banco são criados antes da primeira alteração de cada hora,
com retenção de 168 snapshots. Fotos removidas não são apagadas do disco.

Diretório publicado: `public_html/catalogo-hostinger` da conta `u550209265`.
Domínio final: `catalogo.creditisolucoes.com.br`.
O subdomínio `catalogo-teste` serve o mesmo diretório para validar a migração
e atender o proxy de compatibilidade enquanto caches DNS antigos expiram.

## Instagram

A integração aceita apenas `crediti.oficial`. A configuração privada é
`.catalogo-data/instagram-settings.php`, retornando um array com `app_secret`.
Essa chave nunca vai ao frontend, ao Git ou aos backups públicos. O callback é
`https://catalogo.creditisolucoes.com.br/api/instagram/callback`.
A publicação só começa após a confirmação no botão Publicar do administrador.
Sem configuração e autorização, o sistema informa a pendência e não usa a
conta pessoal nem baixa fotos para a galeria.

## Validação e volta à versão anterior

`python3 hostinger/test_backend.py` executa testes com banco e senha descartáveis.
O script usa o runtime PHP local informado em suas constantes; ajuste-os conforme
o ambiente. Testes não alteram o banco de produção.

Antes de voltar ao Supabase, exporte as alterações feitas na Hostinger desde a
migração. Restaure o worker anterior e os registros DNS salvos, e remova apenas
os bloqueios de escrita das tabelas `veiculos` e `fotos_veiculo`. Não desative
o projeto Supabase: ele também contém dados de outros sistemas.
