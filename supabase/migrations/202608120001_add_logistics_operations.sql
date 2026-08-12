-- Etapa C: operação logística e etiquetas do Melhor Envio.
-- Nenhuma compra é automática: as operações financeiras são iniciadas apenas
-- por uma ação administrativa autenticada no servidor.

alter table public.store_settings
  add column if not exists shipping_sender_name text,
  add column if not exists shipping_sender_phone text,
  add column if not exists shipping_sender_document text,
  add column if not exists shipping_sender_company_document text,
  add column if not exists shipping_sender_state_register text,
  add column if not exists shipping_sender_address text,
  add column if not exists shipping_sender_number text,
  add column if not exists shipping_sender_complement text,
  add column if not exists shipping_sender_district text,
  add column if not exists shipping_sender_city text,
  add column if not exists shipping_sender_state text;

alter table public.orders drop constraint if exists orders_status_logistics_check;
alter table public.orders add constraint orders_status_logistics_check check (
  status in ('novo','confirmado','em_preparo','pronto_para_envio','enviado','saiu_para_entrega','entregue','cancelado')
) not valid;
alter table public.orders validate constraint orders_status_logistics_check;

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  provider text not null,
  carrier text,
  service_name text,
  external_service_id text,
  quoted_amount_cents bigint not null default 0 check (quoted_amount_cents >= 0),
  estimated_days_min integer,
  estimated_days_max integer,
  logistics_status text not null default 'confirmado',
  label_status text not null default 'nao_solicitada',
  purchase_idempotency_key uuid unique,
  external_order_id text unique,
  tracking_code text,
  provider_status text,
  cart_created_at timestamptz,
  purchase_started_at timestamptz,
  purchased_at timestamptz,
  label_generated_at timestamptz,
  tracking_last_synced_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shipments_provider_check check (provider in ('manual','melhor_envio')),
  constraint shipments_logistics_status_check check (logistics_status in ('confirmado','em_preparacao','pronto_para_envio','enviado','entregue','cancelado')),
  constraint shipments_label_status_check check (label_status in ('nao_solicitada','carrinho_criado','comprando','comprada','gerada','falhou')),
  constraint shipments_estimate_check check (
    (estimated_days_min is null or estimated_days_min >= 1)
    and (estimated_days_max is null or estimated_days_max >= coalesce(estimated_days_min, 1))
  )
);

create table if not exists public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  status text not null,
  source text not null,
  description text,
  provider_event_id text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint shipment_events_source_check check (source in ('admin','melhor_envio','sistema')),
  constraint shipment_events_status_check check (btrim(status) <> '')
);

create index if not exists shipments_logistics_status_idx on public.shipments(logistics_status);
create index if not exists shipments_tracking_code_idx on public.shipments(tracking_code) where tracking_code is not null;
create index if not exists shipment_events_shipment_occurred_idx on public.shipment_events(shipment_id, occurred_at desc);
create unique index if not exists shipment_events_provider_event_uidx
  on public.shipment_events(shipment_id, provider_event_id);

drop trigger if exists shipments_updated_at on public.shipments;
create trigger shipments_updated_at before update on public.shipments
  for each row execute procedure public.touch_orders_updated_at();

alter table public.shipments enable row level security;
alter table public.shipment_events enable row level security;

drop policy if exists "Customers read own shipments" on public.shipments;
create policy "Customers read own shipments" on public.shipments for select to authenticated using (
  exists (select 1 from public.orders o where o.id = shipments.order_id and o.customer_id = auth.uid())
  or public.is_admin()
);

drop policy if exists "Customers read own shipment events" on public.shipment_events;
create policy "Customers read own shipment events" on public.shipment_events for select to authenticated using (
  exists (
    select 1 from public.shipments s
    join public.orders o on o.id = s.order_id
    where s.id = shipment_events.shipment_id
      and (o.customer_id = auth.uid() or public.is_admin())
  )
);

revoke all on table public.shipments from anon, authenticated;
revoke all on table public.shipment_events from anon, authenticated;
grant select on table public.shipments to authenticated;
grant select on table public.shipment_events to authenticated;
grant all on table public.shipments to service_role;
grant all on table public.shipment_events to service_role;

-- Reserva atômica da compra. A mesma chave pode ser repetida; outra chave não
-- assume uma compra já iniciada. A função não chama o provedor nem movimenta saldo.
create or replace function public.reserve_shipment_purchase(
  p_order_id uuid,
  p_idempotency_key uuid
)
returns table(shipment_id uuid, external_order_id text, label_status text, existing boolean)
language plpgsql security definer set search_path = public
as $$
declare v_shipment public.shipments%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Operação permitida somente no servidor.' using errcode = '42501';
  end if;
  if p_order_id is null or p_idempotency_key is null then
    raise exception 'Parâmetros de compra inválidos.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_order_id::text));
  select * into v_shipment from public.shipments s where s.order_id = p_order_id for update;
  if not found then raise exception 'Remessa não preparada.' using errcode = 'P0001'; end if;
  if v_shipment.provider <> 'melhor_envio' or v_shipment.external_order_id is null then
    raise exception 'Etiqueta do Melhor Envio não preparada.' using errcode = 'P0001';
  end if;
  if v_shipment.label_status in ('comprada','gerada') then
    return query select v_shipment.id, v_shipment.external_order_id, v_shipment.label_status, true;
    return;
  end if;
  if v_shipment.purchase_idempotency_key is not null and v_shipment.purchase_idempotency_key <> p_idempotency_key then
    raise exception 'Já existe uma compra em andamento para este pedido.' using errcode = '23505';
  end if;

  update public.shipments s set
    purchase_idempotency_key = p_idempotency_key,
    purchase_started_at = coalesce(s.purchase_started_at, now()),
    label_status = 'comprando',
    last_error_code = null
  where s.id = v_shipment.id
  returning * into v_shipment;

  return query select v_shipment.id, v_shipment.external_order_id, v_shipment.label_status, false;
end;
$$;
revoke all on function public.reserve_shipment_purchase(uuid,uuid) from public,anon,authenticated;
grant execute on function public.reserve_shipment_purchase(uuid,uuid) to service_role;
