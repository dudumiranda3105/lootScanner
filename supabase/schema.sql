-- ============================================================================
--  LootScanner — esquema do banco PostgreSQL (Supabase)
--
--  Como usar: painel do Supabase ▸ SQL Editor ▸ New query ▸ colar tudo ▸ Run.
--  O script pode ser rodado mais de uma vez sem quebrar nada.
-- ============================================================================


-- ----------------------------------------------------------------------------
--  1. Perfis — o "nome de caçador" que aparece no mural
-- ----------------------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  hunter_name text not null default 'Caçador',
  created_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Dados públicos de cada usuário. O e-mail fica só em auth.users.';


-- ----------------------------------------------------------------------------
--  2. Itens achados — o mural coletivo
-- ----------------------------------------------------------------------------

create table if not exists public.loot_items (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users on delete cascade,

  -- Id da linha no SQLite do aparelho. Junto com owner_id forma a chave que
  -- torna o upload idempotente: reenviar o mesmo item atualiza, não duplica.
  local_id   text not null,

  catalog_id text not null,
  name       text not null,
  category   text not null,
  rarity     text not null,
  emblem     text not null,
  found_at   text not null default '',
  note       text not null default '',
  status     text not null default 'guardado',
  photo_url  text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint loot_items_owner_local_key unique (owner_id, local_id),
  constraint loot_items_status_check    check (status in ('guardado', 'devolvido')),
  constraint loot_items_rarity_check    check (
    rarity in ('comum', 'incomum', 'raro', 'epico', 'lendario')
  )
);

create index if not exists loot_items_created_idx on public.loot_items (created_at desc);
create index if not exists loot_items_owner_idx   on public.loot_items (owner_id);


-- ----------------------------------------------------------------------------
--  3. Gatilhos
-- ----------------------------------------------------------------------------

-- 3.1  Todo usuário novo ganha um perfil automaticamente.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, hunter_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'hunter_name', ''), 'Caçador')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 3.2  updated_at é responsabilidade do banco, não do app.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists loot_items_touch_updated_at on public.loot_items;
create trigger loot_items_touch_updated_at
  before update on public.loot_items
  for each row execute function public.touch_updated_at();


-- ----------------------------------------------------------------------------
--  4. Row Level Security
--
--  O app usa a chave "anon", que é pública. Quem realmente protege os dados são
--  as políticas abaixo: qualquer pessoa LOGADA lê o mural inteiro (é essa a
--  função dele), mas só o dono pode criar, alterar ou apagar os próprios itens.
-- ----------------------------------------------------------------------------

alter table public.profiles   enable row level security;
alter table public.loot_items enable row level security;

drop policy if exists "perfis visíveis para autenticados" on public.profiles;
create policy "perfis visíveis para autenticados"
  on public.profiles for select to authenticated using (true);

drop policy if exists "cada um edita o próprio perfil" on public.profiles;
create policy "cada um edita o próprio perfil"
  on public.profiles for update to authenticated using (auth.uid() = id);

drop policy if exists "cada um cria o próprio perfil" on public.profiles;
create policy "cada um cria o próprio perfil"
  on public.profiles for insert to authenticated with check (auth.uid() = id);

drop policy if exists "mural visível para autenticados" on public.loot_items;
create policy "mural visível para autenticados"
  on public.loot_items for select to authenticated using (true);

drop policy if exists "dono publica" on public.loot_items;
create policy "dono publica"
  on public.loot_items for insert to authenticated with check (auth.uid() = owner_id);

drop policy if exists "dono atualiza" on public.loot_items;
create policy "dono atualiza"
  on public.loot_items for update to authenticated using (auth.uid() = owner_id);

drop policy if exists "dono remove" on public.loot_items;
create policy "dono remove"
  on public.loot_items for delete to authenticated using (auth.uid() = owner_id);


-- ----------------------------------------------------------------------------
--  5. View do mural — itens já com o nome de quem achou
-- ----------------------------------------------------------------------------

create or replace view public.mural_view
with (security_invoker = true) as
  select
    i.id,
    i.owner_id,
    coalesce(p.hunter_name, 'Caçador anônimo') as finder_name,
    i.catalog_id,
    i.name,
    i.category,
    i.rarity,
    i.emblem,
    i.found_at,
    i.note,
    i.status,
    i.photo_url,
    i.created_at,
    i.updated_at
  from public.loot_items i
  left join public.profiles p on p.id = i.owner_id;

-- `security_invoker` faz a view respeitar as políticas de RLS de quem consulta.
grant select on public.mural_view to authenticated;
