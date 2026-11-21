create table public.catalogo_instagram_connection (
  id text primary key check (id = 'crediti.oficial'),
  instagram_id text not null,
  encrypted_token text not null,
  account_type text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);
create table public.catalogo_instagram_oauth (
  state_hash text primary key,
  owner_id uuid not null,
  expires_at timestamptz not null
);
create table public.catalogo_instagram_jobs (
  id uuid primary key,
  owner_id uuid not null,
  payload_hash text not null,
  format text not null check (format in ('feed','stories')),
  status text not null default 'creating',
  items jsonb not null default '[]',
  error text,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.catalogo_instagram_connection enable row level security;
alter table public.catalogo_instagram_oauth enable row level security;
alter table public.catalogo_instagram_jobs enable row level security;
revoke all on public.catalogo_instagram_connection,public.catalogo_instagram_oauth,public.catalogo_instagram_jobs from public,anon,authenticated;
grant all on public.catalogo_instagram_connection,public.catalogo_instagram_oauth,public.catalogo_instagram_jobs to service_role;
create function public.catalogo_instagram_claim(job_id uuid,owner uuid)
returns setof public.catalogo_instagram_jobs language sql security invoker set search_path='' as $$
 update public.catalogo_instagram_jobs set locked_until=now()+interval '90 seconds'
 where id=job_id and owner_id=owner and (locked_until is null or locked_until < now())
 returning *;
$$;
revoke all on function public.catalogo_instagram_claim(uuid,uuid) from public,anon,authenticated;
grant execute on function public.catalogo_instagram_claim(uuid,uuid) to service_role;
