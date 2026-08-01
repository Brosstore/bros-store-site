-- Área do Cliente: perfis e endereços vinculados a auth.users.
create table if not exists public.profile (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  sobrenome text not null default '',
  telefone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  apelido text not null default 'Principal',
  destinatario text not null,
  cep text not null,
  rua text not null,
  numero text not null,
  complemento text,
  bairro text not null,
  cidade text not null,
  estado text not null,
  principal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists addresses_user_id_idx on public.addresses(user_id);
create unique index if not exists addresses_one_primary_per_user_idx on public.addresses(user_id) where principal;

create or replace function public.handle_new_customer_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profile (id, nome, sobrenome, telefone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    coalesce(new.raw_user_meta_data ->> 'sobrenome', ''),
    nullif(new.raw_user_meta_data ->> 'telefone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_customer_profile();

create or replace function public.touch_customer_records_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profile_updated_at on public.profile;
create trigger profile_updated_at before update on public.profile
  for each row execute procedure public.touch_customer_records_updated_at();

drop trigger if exists addresses_updated_at on public.addresses;
create trigger addresses_updated_at before update on public.addresses
  for each row execute procedure public.touch_customer_records_updated_at();

alter table public.profile enable row level security;
alter table public.addresses enable row level security;

drop policy if exists "Customers read own profile" on public.profile;
create policy "Customers read own profile" on public.profile for select using (auth.uid() = id);
drop policy if exists "Customers insert own profile" on public.profile;
create policy "Customers insert own profile" on public.profile for insert with check (auth.uid() = id);
drop policy if exists "Customers update own profile" on public.profile;
create policy "Customers update own profile" on public.profile for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Customers read own addresses" on public.addresses;
create policy "Customers read own addresses" on public.addresses for select using (auth.uid() = user_id);
drop policy if exists "Customers insert own addresses" on public.addresses;
create policy "Customers insert own addresses" on public.addresses for insert with check (auth.uid() = user_id);
drop policy if exists "Customers update own addresses" on public.addresses;
create policy "Customers update own addresses" on public.addresses for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Customers delete own addresses" on public.addresses;
create policy "Customers delete own addresses" on public.addresses for delete using (auth.uid() = user_id);
