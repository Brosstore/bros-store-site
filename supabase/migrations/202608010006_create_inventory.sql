-- Controle de estoque por produto e por variação.
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

create or replace function public.set_inventory_quantity(p_product_id uuid, p_variant_id uuid, p_quantity integer, p_notes text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_before integer; v_user uuid := auth.uid();
begin
  if v_user is null or not public.is_admin() then raise exception 'Sem permissão para alterar estoque.' using errcode = '42501'; end if;
  if p_quantity is null or p_quantity < 0 then raise exception 'Quantidade de estoque inválida.' using errcode = '22023'; end if;
  if p_variant_id is null then
    select p.stock into v_before from public.products p where p.id = p_product_id for update;
    if not found then raise exception 'Produto não encontrado.' using errcode = 'P0002'; end if;
    v_before := coalesce(v_before, 0);
    update public.products p set stock = p_quantity where p.id = p_product_id;
  else
    select iv.quantity into v_before from public.inventory_variants iv where iv.id = p_variant_id and iv.product_id = p_product_id for update;
    if not found then raise exception 'Variação não encontrada.' using errcode = 'P0002'; end if;
    update public.inventory_variants iv set quantity = p_quantity where iv.id = p_variant_id;
  end if;
  if v_before <> p_quantity then insert into public.stock_movements (product_id, variant_id, movement_type, quantity_delta, quantity_before, quantity_after, notes, created_by) values (p_product_id, p_variant_id, case when p_quantity > v_before then 'entrada' else 'ajuste' end, p_quantity - v_before, v_before, p_quantity, nullif(trim(coalesce(p_notes, '')), ''), v_user); end if;
end;
$$;
revoke all on function public.set_inventory_quantity(uuid, uuid, integer, text) from public;
grant execute on function public.set_inventory_quantity(uuid, uuid, integer, text) to authenticated;
