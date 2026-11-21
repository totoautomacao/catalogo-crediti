# Publicação do catálogo no Instagram

Destino fixo: `crediti.oficial`. Aplicativo Instagram `1346667754213335`, pertencente ao app Meta `3546794588820653`.

A função `catalogo-instagram` valida cada sessão usando `/auth/v1/user` e permite somente o administrador já definido em `admin-auth.js`. A verificação JWT no gateway é desativada porque o retorno OAuth não tem JWT; as demais ações autenticam dentro da função. Estados OAuth têm validade de dez minutos, uso único e apenas o hash é persistido. As tabelas têm RLS e nenhum acesso de anon/authenticated.

## Configuração pendente

Cadastrar `INSTAGRAM_APP_SECRET` nos secrets da Edge Function do projeto Supabase `jfguumxlxmveuszddyky`. Usar a chave do **Instagram**, não a chave do aplicativo Facebook. Nunca colocar a chave no repositório ou no navegador do catálogo. O servidor cifra o token autorizado usando AES-GCM; trocar esta chave exige reconectar o perfil.

Retorno cadastrado na Meta: `https://catalogo-crediti.pages.dev/api/instagram/callback`.
Permissões solicitadas: `instagram_business_basic,instagram_business_content_publish`. A permissão de publicação foi adicionada ao aplicativo na Meta em 21/11/2026. A conta precisa autorizar o acesso depois da configuração da chave. Nenhum token foi obtido e nenhuma publicação real foi feita durante a implementação.

## Fluxo

1. Entrar no catálogo, selecionar fotos e abrir Feed ou Stories.
2. Conectar o perfil na tela oficial do Instagram. O servidor recusa qualquer username diferente de `crediti.oficial`.
3. Reabrir o veículo, revisar as fotos e confirmar a publicação.
4. Feed com mais de uma foto cria carrossel; Stories publica cada foto separadamente. A API não adiciona música/adesivos; fotos precisam atender aos requisitos da Meta (JPEG e dimensões/proporção compatíveis).

IDs de tentativa e bloqueios no banco evitam repetir uma publicação ao consultar andamento. Após uma resposta de publicação incerta, o sistema orienta conferir o perfil e não repete automaticamente. Nada é salvo na galeria. A autorização fica no servidor, não em cookies do catálogo. A conexão não interfere no serviço existente de mensagens/comentários.

Validação local: `node --test tests/instagram.test.mjs`. Testes usam serviços simulados; o teste real depende da chave e da autorização do titular. Não publicar conteúdo de teste sem instrução explícita do titular.
