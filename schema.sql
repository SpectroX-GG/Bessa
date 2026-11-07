-- Bessa Refrigeração: schema inicial
-- Execute este arquivo no Supabase > SQL Editor, em um projeto novo.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'Funcionário',
  role text not null default 'employee' check (role in ('admin','employee')),
  created_at timestamptz not null default now()
);

create table if not exists public.installations (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  phone text,
  scheduled_for date not null,
  scheduled_time time,
  address text not null,
  city text default 'Camocim - CE',
  latitude double precision,
  longitude double precision,
  equipment text,
  notes text,
  status text not null default 'scheduled'
    check (status in ('scheduled','in_progress','completed','cancelled')),
  assigned_to uuid references public.profiles(id),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  installation_id uuid not null references public.installations(id) on delete cascade,
  name text not null,
  checked boolean not null default false,
  checked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists installations_scheduled_for_idx on public.installations(scheduled_for);
create index if not exists checklist_installation_id_idx on public.checklist_items(installation_id);

create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Cria automaticamente o perfil quando um usuário é criado no Auth.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'employee'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.installations enable row level security;
alter table public.checklist_items enable row level security;

drop policy if exists "Authenticated can read profiles" on public.profiles;
create policy "Authenticated can read profiles" on public.profiles
for select to authenticated using (true);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles
for update to authenticated using (id = auth.uid() and role <> 'admin')
with check (id = auth.uid() and role <> 'admin');

drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles" on public.profiles
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Team reads installations" on public.installations;
create policy "Team reads installations" on public.installations
for select to authenticated using (true);

drop policy if exists "Team creates installations" on public.installations;
create policy "Team creates installations" on public.installations
for insert to authenticated with check (created_by = auth.uid());

drop policy if exists "Creator or admin updates installations" on public.installations;
drop policy if exists "Team updates installations" on public.installations;
create policy "Team updates installations" on public.installations
for update to authenticated using (true)
with check (true);

drop policy if exists "Admins delete installations" on public.installations;
create policy "Admins delete installations" on public.installations
for delete to authenticated using (public.is_admin());

drop policy if exists "Team reads checklist" on public.checklist_items;
create policy "Team reads checklist" on public.checklist_items
for select to authenticated using (true);

drop policy if exists "Team adds checklist" on public.checklist_items;
create policy "Team adds checklist" on public.checklist_items
for insert to authenticated with check (true);

drop policy if exists "Team updates checklist" on public.checklist_items;
create policy "Team updates checklist" on public.checklist_items
for update to authenticated using (true) with check (true);

drop policy if exists "Admins delete checklist" on public.checklist_items;
create policy "Admins delete checklist" on public.checklist_items
for delete to authenticated using (public.is_admin());

-- Após criar o primeiro usuário pelo Authentication > Users,
-- execute: update public.profiles set role = 'admin' where id = 'UUID_DO_USUARIO';
