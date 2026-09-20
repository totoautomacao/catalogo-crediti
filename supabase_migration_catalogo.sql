-- Catálogo Crediti - atualização de estrutura
-- Executar no SQL Editor do projeto Supabase do catálogo.

alter table public.veiculos
  add column if not exists valor_lojista numeric,
  add column if not exists quilometragem integer,
  add column if not exists descricao text,
  add column if not exists fipe_marca_codigo text,
  add column if not exists fipe_modelo_codigo text,
  add column if not exists fipe_ano_codigo text;

-- Garante limite lógico de fotos pelo app. A tabela fotos_veiculo já é usada pelo projeto.
create index if not exists idx_fotos_veiculo_veiculo_id on public.fotos_veiculo(veiculo_id);
