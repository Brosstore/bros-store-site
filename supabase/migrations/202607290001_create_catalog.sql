-- Bros Store - Fase 1: estrutura do catálogo e segurança.
-- O bucket é público por decisão do projeto; portanto, URLs de arquivos não
-- devem ser usadas para confidencialidade. Produtos inativos ficam invisíveis
-- pelas políticas das tabelas e pela aplicação.

create extension if not exists pgcrypto;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null,
  price_cents integer not null check (price_cents >= 0),
  old_price_cents integer check (
    old_price_cents is null or old_price_cents >= price_cents
  ),
  category_slug text not null,
  category_name text not null,
  brand text,
  badge text,
  featured boolean not null default false,
  active boolean not null default true,
  stock integer check (stock is null or stock >= 0),
  sizes jsonb not null default '[]'::jsonb,
  colors jsonb not null default '[]'::jsonb,
  display_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint products_slug_format check (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  )
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null unique,
  position integer not null default 0 check (position >= 0),
  alt_text text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (product_id, position)
);

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create index products_active_display_order_idx
  on public.products (active, display_order, created_at desc);

create index products_active_category_idx
  on public.products (active, category_slug, display_order);

create index products_active_featured_idx
  on public.products (active, featured, display_order);

create index product_images_product_position_idx
  on public.product_images (product_id, position);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

-- A função centraliza a autorização administrativa para tabelas e Storage.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.admin_users enable row level security;

create policy "Leitura publica de produtos ativos"
on public.products
for select
to anon, authenticated
using (active = true);

create policy "Administradores gerenciam produtos"
on public.products
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Leitura publica de imagens de produtos ativos"
on public.product_images
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.products
    where products.id = product_images.product_id
      and products.active = true
  )
);

create policy "Administradores gerenciam imagens de produtos"
on public.product_images
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Usuario consulta sua propria permissao administrativa"
on public.admin_users
for select
to authenticated
using (user_id = auth.uid());

-- Bucket deliberadamente público conforme a arquitetura aprovada.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;

-- Em bucket público não é criada política de SELECT para objetos: a leitura
-- ocorre pelas URLs públicas. Escrita continua restrita a administradores.
create policy "Administradores enviam imagens de produto"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-images' and public.is_admin()
);

create policy "Administradores atualizam imagens de produto"
on storage.objects
for update
to authenticated
using (bucket_id = 'product-images' and public.is_admin())
with check (bucket_id = 'product-images' and public.is_admin());

create policy "Administradores excluem imagens de produto"
on storage.objects
for delete
to authenticated
using (bucket_id = 'product-images' and public.is_admin());
C:/Users/PAULO FRANÇA/Desktop/bros-store-site-main/supabase/migrations/202607290001_create_catalog.sql