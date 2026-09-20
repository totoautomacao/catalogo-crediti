-- Catálogo Crediti - atualização de estrutura e permissões de fotos
-- Executar no SQL Editor do projeto Supabase do catálogo.

alter table public.veiculos
  add column if not exists valor_lojista numeric,
  add column if not exists quilometragem numeric,
  add column if not exists descricao text,
  add column if not exists fipe_marca_codigo text,
  add column if not exists fipe_modelo_codigo text,
  add column if not exists fipe_ano_codigo text;

create index if not exists idx_fotos_veiculo_veiculo_id
  on public.fotos_veiculo(veiculo_id);

-- Tabela de fotos: permite que o app público leia e grave fotos.
alter table public.fotos_veiculo enable row level security;

drop policy if exists "catalogo_fotos_select" on public.fotos_veiculo;
drop policy if exists "catalogo_fotos_insert" on public.fotos_veiculo;
drop policy if exists "catalogo_fotos_update" on public.fotos_veiculo;
drop policy if exists "catalogo_fotos_delete" on public.fotos_veiculo;

create policy "catalogo_fotos_select"
on public.fotos_veiculo
for select
to anon, authenticated
using (true);

create policy "catalogo_fotos_insert"
on public.fotos_veiculo
for insert
to anon, authenticated
with check (true);

create policy "catalogo_fotos_update"
on public.fotos_veiculo
for update
to anon, authenticated
using (true)
with check (true);

create policy "catalogo_fotos_delete"
on public.fotos_veiculo
for delete
to anon, authenticated
using (true);

-- Garante que o bucket fotos exista e seja público para leitura.
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do update set public = true;

-- Storage: libera leitura e upload somente dentro do bucket fotos.
drop policy if exists "catalogo_storage_select" on storage.objects;
drop policy if exists "catalogo_storage_insert" on storage.objects;
drop policy if exists "catalogo_storage_update" on storage.objects;
drop policy if exists "catalogo_storage_delete" on storage.objects;

create policy "catalogo_storage_select"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'fotos');

create policy "catalogo_storage_insert"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'fotos');

create policy "catalogo_storage_update"
on storage.objects
for update
to anon, authenticated
using (bucket_id = 'fotos')
with check (bucket_id = 'fotos');

create policy "catalogo_storage_delete"
on storage.objects
for delete
to anon, authenticated
using (bucket_id = 'fotos');
