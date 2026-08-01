-- Correção idempotente para projetos em que a infraestrutura da Sprint 4 não foi criada.
alter table public.products add column if not exists low_stock_threshold integer not null default 3 check (low_stock_threshold >= 0);

create table if not exists public.inventory_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null default '',
  color text not null default '',
  quantity integer not null default 0 check (quantity >= 0),
  low_stock_threshold integer not null default 3 check (low_stock_threshold >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, size, color)
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.inventory_variants(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  movement_type text not null check (movement_type in ('entrada', 'ajuste', 'saida_pedido', 'cancelamento')),
  quantity_delta integer not null check (quantity_delta <> 0),
  quantity_before integer not null,
  quantity_after integer not null,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists inventory_variants_product_id_idx on public.inventory_variants(product_id);
create index if not exists stock_movements_product_created_at_idx on public.stock_movements(product_id, created_at desc);
create index if not exists stock_movements_variant_created_at_idx on public.stock_movements(variant_id, created_at desc);
create index if not exists stock_movements_order_id_idx on public.stock_movements(order_id);

drop trigger if exists inventory_variants_updated_at on public.inventory_variants;
create trigger inventory_variants_updated_at before update on public.inventory_variants for each row execute function public.set_updated_at();

alter table public.inventory_variants enable row level security;
alter table public.stock_movements enable row level security;

drop policy if exists "Public reads inventory availability" on public.inventory_variants;
create policy "Public reads inventory availability" on public.inventory_variants for select to anon, authenticated using (
  exists (select 1 from public.products p where p.id = inventory_variants.product_id and p.active = true)
);
drop policy if exists "Admins manage inventory variants" on public.inventory_variants;
create policy "Admins manage inventory variants" on public.inventory_variants for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins read stock movements" on public.stock_movements;
create policy "Admins read stock movements" on public.stock_movements for select to authenticated using (public.is_admin());
drop policy if exists "Admins manage stock movements" on public.stock_movements;
create policy "Admins manage stock movements" on public.stock_movements for all to authenticated using (public.is_admin()) with check (public.is_admin());
