-- Pedidos da Bros Store. A área do cliente atual armazena endereços em public.addresses.
create sequence if not exists public.orders_order_number_seq start with 1000 increment by 1;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint not null unique,
  customer_id uuid not null references auth.users(id) on delete restrict,
  address_id uuid references public.addresses(id) on delete set null,
  status text not null default 'novo',
  payment_method text,
  subtotal bigint not null default 0,
  shipping bigint not null default 0,
  discount bigint not null default 0,
  total bigint not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid,
  product_name text not null,
  size text,
  color text,
  unit_price bigint not null default 0,
  quantity integer not null check (quantity > 0),
  subtotal bigint not null default 0
);

create or replace function public.assign_order_number()
returns trigger
language plpgsql
as $$
begin
  if new.order_number is null then
    new.order_number = nextval('public.orders_order_number_seq');
  end if;
  return new;
end;
$$;

create or replace function public.touch_orders_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_assign_order_number on public.orders;
create trigger orders_assign_order_number before insert on public.orders
  for each row execute procedure public.assign_order_number();

drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at before update on public.orders
  for each row execute procedure public.touch_orders_updated_at();

create index if not exists orders_customer_id_idx on public.orders(customer_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists order_items_order_id_idx on public.order_items(order_id);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Cliente: apenas pedidos próprios.
drop policy if exists "Customers read own orders" on public.orders;
create policy "Customers read own orders" on public.orders for select using (customer_id = auth.uid());
drop policy if exists "Customers create own orders" on public.orders;
create policy "Customers create own orders" on public.orders for insert with check (customer_id = auth.uid());

drop policy if exists "Customers read own order items" on public.order_items;
create policy "Customers read own order items" on public.order_items for select using (
  exists (select 1 from public.orders where orders.id = order_items.order_id and orders.customer_id = auth.uid())
);
drop policy if exists "Customers create own order items" on public.order_items;
create policy "Customers create own order items" on public.order_items for insert with check (
  exists (select 1 from public.orders where orders.id = order_items.order_id and orders.customer_id = auth.uid())
);

-- Administradores: controle completo, usando a lista administrativa já existente.
drop policy if exists "Admins manage orders" on public.orders;
create policy "Admins manage orders" on public.orders for all using (
  exists (select 1 from public.admin_users where admin_users.user_id = auth.uid())
) with check (
  exists (select 1 from public.admin_users where admin_users.user_id = auth.uid())
);
drop policy if exists "Admins manage order items" on public.order_items;
create policy "Admins manage order items" on public.order_items for all using (
  exists (select 1 from public.admin_users where admin_users.user_id = auth.uid())
) with check (
  exists (select 1 from public.admin_users where admin_users.user_id = auth.uid())
);
