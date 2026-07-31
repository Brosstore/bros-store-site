create table public.store_settings (
  id boolean primary key default true check (id),
  store_name text not null default 'Bros Store',
  slogan text not null default 'Vista sua atitude.',
  description text not null default 'Bros Store: moda, streetwear e acessórios para vestir sua personalidade.',
  whatsapp text not null default '5598985106065',
  email text not null default 'contatobrosstore@gmail.com',
  instagram text,
  facebook text,
  tiktok text,
  address text,
  city text,
  state text,
  opening_hours text,
  logo_path text,
  banner_path text,
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger store_settings_set_updated_at
before update on public.store_settings
for each row execute function public.set_updated_at();

alter table public.store_settings enable row level security;

create policy "Leitura pública das configurações da loja"
on public.store_settings
for select
to anon, authenticated
using (true);

create policy "Administradores gerenciam configurações da loja"
on public.store_settings
for all
to authenticated
using (
  exists (
    select 1 from public.admin_users where admin_users.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.admin_users where admin_users.user_id = auth.uid()
  )
);

insert into public.store_settings (id)
values (true)
on conflict (id) do nothing;
