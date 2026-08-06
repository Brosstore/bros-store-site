-- Infraestrutura universal de frete. O banco recalcula o valor dentro da mesma
-- transação que valida preços e baixa estoque; valores enviados pelo navegador
-- nunca são usados.
alter table public.store_settings
  add column if not exists shipping_manual_enabled boolean not null default true,
  add column if not exists shipping_manual_service_name text not null default 'Entrega padrão',
  add column if not exists shipping_manual_amount_cents bigint not null default 0,
  add column if not exists shipping_manual_free_threshold_cents bigint,
  add column if not exists shipping_manual_estimated_days_min integer,
  add column if not exists shipping_manual_estimated_days_max integer;

alter table public.store_settings drop constraint if exists store_settings_shipping_manual_check;
alter table public.store_settings add constraint store_settings_shipping_manual_check check (
  btrim(shipping_manual_service_name) <> ''
  and shipping_manual_amount_cents >= 0
  and (shipping_manual_free_threshold_cents is null or shipping_manual_free_threshold_cents >= 0)
  and (shipping_manual_estimated_days_min is null or shipping_manual_estimated_days_min >= 1)
  and (shipping_manual_estimated_days_max is null or shipping_manual_estimated_days_max >= coalesce(shipping_manual_estimated_days_min, 1))
);

alter table public.orders
  add column if not exists shipping_provider text,
  add column if not exists shipping_service text,
  add column if not exists shipping_service_name text,
  add column if not exists shipping_estimated_days_min integer,
  add column if not exists shipping_estimated_days_max integer,
  add column if not exists shipping_quote_metadata jsonb not null default '{}'::jsonb;

alter table public.orders drop constraint if exists orders_shipping_details_check;
alter table public.orders add constraint orders_shipping_details_check check (
  shipping >= 0
  and (shipping_provider is null or btrim(shipping_provider) <> '')
  and (shipping_service is null or btrim(shipping_service) <> '')
  and (shipping_estimated_days_min is null or shipping_estimated_days_min >= 1)
  and (shipping_estimated_days_max is null or shipping_estimated_days_max >= coalesce(shipping_estimated_days_min, 1))
  and jsonb_typeof(shipping_quote_metadata) = 'object'
);

create or replace function public.calculate_customer_shipping(
  p_address_id uuid,
  p_items jsonb,
  p_shipping_service text default 'manual-standard'
)
returns table(provider text, service text, service_name text, amount_cents bigint, estimated_days_min integer, estimated_days_max integer, metadata jsonb)
language plpgsql security definer set search_path = public
as $$
declare
  v_customer_id uuid := auth.uid(); v_address public.addresses%rowtype; v_settings public.store_settings%rowtype;
  v_item jsonb; v_product public.products%rowtype; v_product_id uuid; v_quantity integer; v_subtotal bigint := 0; v_amount bigint;
begin
  if v_customer_id is null then raise exception 'Sessão expirada. Entre novamente.' using errcode = '28000'; end if;
  if p_shipping_service <> 'manual-standard' then raise exception 'Serviço de frete indisponível.' using errcode = '22023'; end if;
  select a.* into v_address from public.addresses a where a.id = p_address_id and a.user_id = v_customer_id;
  if not found then raise exception 'O endereço selecionado não pertence à sua conta.' using errcode = '42501'; end if;
  if regexp_replace(coalesce(v_address.cep, ''), '\D', '', 'g') !~ '^\d{8}$' or nullif(btrim(v_address.cidade), '') is null or v_address.estado !~ '^[A-Za-z]{2}$' then
    raise exception 'O endereço de entrega está incompleto ou possui CEP inválido.' using errcode = '22023';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'Seu carrinho está vazio ou possui itens inválidos.' using errcode = '22023';
  end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    begin v_product_id := (v_item ->> 'productId')::uuid; v_quantity := (v_item ->> 'quantity')::integer;
    exception when others then raise exception 'Há um produto inválido no carrinho.' using errcode = '22023'; end;
    if v_quantity is null or v_quantity < 1 or v_quantity > 99 then raise exception 'A quantidade de cada produto é inválida.' using errcode = '22023'; end if;
    select p.* into v_product from public.products p where p.id = v_product_id and p.active = true;
    if not found then raise exception 'Um produto do carrinho não está mais disponível.' using errcode = 'P0001'; end if;
    v_subtotal := v_subtotal + v_product.price_cents::bigint * v_quantity;
  end loop;
  select s.* into v_settings from public.store_settings s where s.id = true;
  if not found or not v_settings.shipping_manual_enabled then raise exception 'Nenhuma modalidade de entrega está disponível.' using errcode = 'P0001'; end if;
  v_amount := case when v_settings.shipping_manual_free_threshold_cents is not null and v_subtotal >= v_settings.shipping_manual_free_threshold_cents then 0 else v_settings.shipping_manual_amount_cents end;
  return query select 'manual'::text, 'manual-standard'::text, v_settings.shipping_manual_service_name, v_amount,
    v_settings.shipping_manual_estimated_days_min, v_settings.shipping_manual_estimated_days_max,
    jsonb_build_object('version', 1, 'pricing', case when v_amount = 0 and v_settings.shipping_manual_free_threshold_cents is not null then 'free_threshold' else 'flat_rate' end);
end;
$$;
revoke all on function public.calculate_customer_shipping(uuid, jsonb, text) from public, anon;
grant execute on function public.calculate_customer_shipping(uuid, jsonb, text) to authenticated;

create or replace function public.create_customer_order(p_address_id uuid, p_payment_method text, p_notes text, p_items jsonb, p_shipping_service text)
returns table(order_id uuid, order_number bigint)
language plpgsql security definer set search_path = public
as $$
declare
  v_customer_id uuid := auth.uid(); v_item jsonb; v_product public.products%rowtype; v_variant public.inventory_variants%rowtype;
  v_quote record; v_product_id uuid; v_quantity integer; v_size text; v_color text; v_subtotal bigint := 0;
  v_created_order_id uuid; v_created_order_number bigint; v_before integer;
begin
  if v_customer_id is null then raise exception 'Sessão expirada. Entre novamente.' using errcode = '28000'; end if;
  if p_payment_method not in ('pix', 'dinheiro', 'cartao_na_entrega') then raise exception 'Forma de pagamento inválida.' using errcode = '22023'; end if;
  select * into v_quote from public.calculate_customer_shipping(p_address_id, p_items, p_shipping_service);
  insert into public.orders as o (customer_id,address_id,payment_method,notes,shipping,shipping_provider,shipping_service,shipping_service_name,shipping_estimated_days_min,shipping_estimated_days_max,shipping_quote_metadata)
    values (v_customer_id,p_address_id,p_payment_method,nullif(trim(coalesce(p_notes,'')),''),v_quote.amount_cents,v_quote.provider,v_quote.service,v_quote.service_name,v_quote.estimated_days_min,v_quote.estimated_days_max,v_quote.metadata)
    returning o.id,o.order_number into v_created_order_id,v_created_order_number;
  for v_item in select value from jsonb_array_elements(p_items) loop
    begin v_product_id := (v_item->>'productId')::uuid; v_quantity := (v_item->>'quantity')::integer; exception when others then raise exception 'Há um produto inválido no carrinho.' using errcode='22023'; end;
    v_size := nullif(trim(coalesce(v_item->>'selectedSize','')),''); v_color := nullif(trim(coalesce(v_item->>'selectedColor','')),'');
    select p.* into v_product from public.products p where p.id=v_product_id and p.active=true for update;
    if not found then raise exception 'Um produto do carrinho não está mais disponível.' using errcode='P0001'; end if;
    if jsonb_array_length(v_product.sizes)>0 and (v_size is null or not(v_product.sizes ? v_size)) then raise exception 'O tamanho escolhido não está disponível para %.',v_product.name using errcode='22023'; end if;
    if jsonb_array_length(v_product.colors)>0 and (v_color is null or not(v_product.colors ? v_color)) then raise exception 'A cor escolhida não está disponível para %.',v_product.name using errcode='22023'; end if;
    select iv.* into v_variant from public.inventory_variants iv where iv.product_id=v_product_id and iv.size=coalesce(v_size,'') and iv.color=coalesce(v_color,'') for update;
    if found then
      if v_variant.quantity<v_quantity then raise exception 'Estoque insuficiente para %.',v_product.name using errcode='P0001'; end if;
      v_before:=v_variant.quantity; update public.inventory_variants iv set quantity=iv.quantity-v_quantity where iv.id=v_variant.id;
      insert into public.stock_movements(product_id,variant_id,order_id,movement_type,quantity_delta,quantity_before,quantity_after,notes,created_by) values(v_product_id,v_variant.id,v_created_order_id,'saida_pedido',-v_quantity,v_before,v_before-v_quantity,'Baixa automática do pedido',v_customer_id);
    elsif v_product.stock is not null then
      if v_product.stock<v_quantity then raise exception 'Estoque insuficiente para %.',v_product.name using errcode='P0001'; end if;
      v_before:=v_product.stock; update public.products p set stock=p.stock-v_quantity where p.id=v_product_id;
      insert into public.stock_movements(product_id,order_id,movement_type,quantity_delta,quantity_before,quantity_after,notes,created_by) values(v_product_id,v_created_order_id,'saida_pedido',-v_quantity,v_before,v_before-v_quantity,'Baixa automática do pedido',v_customer_id);
    end if;
    insert into public.order_items as oi(order_id,product_id,product_name,size,color,unit_price,quantity,subtotal) values(v_created_order_id,v_product.id,v_product.name,v_size,v_color,v_product.price_cents,v_quantity,v_product.price_cents::bigint*v_quantity);
    v_subtotal:=v_subtotal+v_product.price_cents::bigint*v_quantity;
  end loop;
  update public.orders o set subtotal=v_subtotal,discount=0,total=v_subtotal+v_quote.amount_cents where o.id=v_created_order_id;
  return query select v_created_order_id,v_created_order_number;
end; $$;
revoke all on function public.create_customer_order(uuid,text,text,jsonb,text) from public,anon;
grant execute on function public.create_customer_order(uuid,text,text,jsonb,text) to authenticated;

create or replace function public.create_customer_order(p_address_id uuid,p_payment_method text,p_notes text,p_items jsonb)
returns table(order_id uuid,order_number bigint) language sql security definer set search_path=public
as $$ select * from public.create_customer_order(p_address_id,p_payment_method,p_notes,p_items,'manual-standard'); $$;

create or replace function public.start_mercado_pago_order(p_address_id uuid,p_notes text,p_items jsonb,p_idempotency_key uuid,p_payment_method text,p_shipping_service text)
returns table(order_id uuid,order_number bigint,payment_attempt_id uuid,external_reference text,existing boolean)
language plpgsql security definer set search_path=public as $$
declare v_existing public.payment_attempts%rowtype; v_order_id uuid; v_order_number bigint; v_attempt_id uuid; v_reference text; v_legacy text;
begin
  if auth.uid() is null then raise exception 'Sessão expirada. Entre novamente.' using errcode='28000'; end if;
  if p_idempotency_key is null then raise exception 'Chave de idempotência inválida.' using errcode='22023'; end if;
  if p_payment_method not in ('mercado_pago_pix','mercado_pago_cartao') then raise exception 'Forma de pagamento online inválida.' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtext(p_idempotency_key::text));
  select pa.* into v_existing from public.payment_attempts pa where pa.idempotency_key=p_idempotency_key for update;
  if found then
    if not exists(select 1 from public.orders o where o.id=v_existing.order_id and o.customer_id=auth.uid()) then raise exception 'Esta chave de idempotência não pertence à sua conta.' using errcode='42501'; end if;
    return query select v_existing.order_id,o.order_number,v_existing.id,v_existing.external_reference,true from public.orders o where o.id=v_existing.order_id; return;
  end if;
  v_legacy:=case when p_payment_method='mercado_pago_pix' then 'pix' else 'cartao_na_entrega' end;
  select c.order_id,c.order_number into v_order_id,v_order_number from public.create_customer_order(p_address_id,v_legacy,p_notes,p_items,p_shipping_service)c;
  v_reference:=v_order_id::text; update public.orders set payment_method=p_payment_method,payment_status='aguardando_pagamento' where id=v_order_id;
  insert into public.payment_attempts(order_id,provider,idempotency_key,external_reference,status,payment_method) values(v_order_id,'mercado_pago',p_idempotency_key,v_reference,'pending',p_payment_method) returning id into v_attempt_id;
  return query select v_order_id,v_order_number,v_attempt_id,v_reference,false;
end; $$;
revoke all on function public.start_mercado_pago_order(uuid,text,jsonb,uuid,text,text) from public,anon;
grant execute on function public.start_mercado_pago_order(uuid,text,jsonb,uuid,text,text) to authenticated;

create or replace function public.start_mercado_pago_order(p_address_id uuid,p_notes text,p_items jsonb,p_idempotency_key uuid,p_payment_method text)
returns table(order_id uuid,order_number bigint,payment_attempt_id uuid,external_reference text,existing boolean)
language sql security definer set search_path=public
as $$ select * from public.start_mercado_pago_order(p_address_id,p_notes,p_items,p_idempotency_key,p_payment_method,'manual-standard'); $$;
