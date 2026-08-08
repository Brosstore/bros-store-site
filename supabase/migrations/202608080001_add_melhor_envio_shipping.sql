alter table public.store_settings add column if not exists shipping_melhor_envio_enabled boolean not null default false,
  add column if not exists shipping_origin_postal_code text,
  add column if not exists shipping_default_weight_grams integer,
  add column if not exists shipping_default_length_cm integer,
  add column if not exists shipping_default_width_cm integer,
  add column if not exists shipping_default_height_cm integer;
update public.store_settings set shipping_origin_postal_code='65058484',shipping_default_weight_grams=800,shipping_default_length_cm=35,shipping_default_width_cm=23,shipping_default_height_cm=13 where id=true;
alter table public.store_settings drop constraint if exists store_settings_external_shipping_check;
alter table public.store_settings add constraint store_settings_external_shipping_check check (
  (shipping_origin_postal_code is null or shipping_origin_postal_code ~ '^\d{8}$') and
  (shipping_default_weight_grams is null or shipping_default_weight_grams between 1 and 30000) and
  (shipping_default_length_cm is null or shipping_default_length_cm between 1 and 200) and
  (shipping_default_width_cm is null or shipping_default_width_cm between 1 and 200) and
  (shipping_default_height_cm is null or shipping_default_height_cm between 1 and 200));

create table if not exists public.shipping_provider_credentials(
  provider text primary key, access_token_encrypted text not null, refresh_token_encrypted text not null,
  expires_at timestamptz not null, updated_at timestamptz not null default now(),
  constraint shipping_provider_credentials_provider check(provider in('melhor_envio')));
alter table public.shipping_provider_credentials enable row level security;
revoke all on public.shipping_provider_credentials from public,anon,authenticated;
grant all on public.shipping_provider_credentials to service_role;

create table if not exists public.external_shipping_quotes(
  id uuid primary key default gen_random_uuid(), customer_id uuid not null references auth.users(id) on delete cascade,
  address_id uuid not null references public.addresses(id) on delete cascade, items jsonb not null,
  provider text not null, external_service_id text not null, service_name text not null,
  amount_cents bigint not null check(amount_cents>=0), estimated_days_min integer, estimated_days_max integer,
  metadata jsonb not null default '{}'::jsonb, expires_at timestamptz not null, created_at timestamptz not null default now(),
  constraint external_shipping_quotes_items check(jsonb_typeof(items)='array'),
  constraint external_shipping_quotes_provider check(provider in('melhor_envio')));
create index if not exists external_shipping_quotes_customer_expires_idx on public.external_shipping_quotes(customer_id,expires_at);
alter table public.external_shipping_quotes enable row level security;
revoke all on public.external_shipping_quotes from public,anon,authenticated;
grant all on public.external_shipping_quotes to service_role;

create or replace function public.calculate_customer_shipping(p_address_id uuid,p_items jsonb,p_shipping_service text default 'manual-standard')
returns table(provider text,service text,service_name text,amount_cents bigint,estimated_days_min integer,estimated_days_max integer,metadata jsonb)
language plpgsql security definer set search_path=public as $$
declare v_customer uuid:=auth.uid(); v_address public.addresses%rowtype; v_settings public.store_settings%rowtype; v_item jsonb; v_product public.products%rowtype; v_id uuid; v_product_id uuid; v_quantity integer; v_subtotal bigint:=0; v_amount bigint; v_quote public.external_shipping_quotes%rowtype;
begin
 if v_customer is null then raise exception 'Sessão expirada. Entre novamente.' using errcode='28000'; end if;
 select * into v_address from public.addresses a where a.id=p_address_id and a.user_id=v_customer;
 if not found then raise exception 'O endereço selecionado não pertence à sua conta.' using errcode='42501'; end if;
 if regexp_replace(coalesce(v_address.cep,''),'\D','','g') !~ '^\d{8}$' then raise exception 'CEP inválido.' using errcode='22023'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 or jsonb_array_length(p_items)>50 then raise exception 'Itens inválidos.' using errcode='22023'; end if;
 for v_item in select value from jsonb_array_elements(p_items) loop
  begin v_product_id:=(v_item->>'productId')::uuid;v_quantity:=(v_item->>'quantity')::integer;exception when others then raise exception 'Produto inválido.' using errcode='22023';end;
  if v_quantity<1 or v_quantity>99 then raise exception 'Quantidade inválida.' using errcode='22023';end if;
  select * into v_product from public.products p where p.id=v_product_id and p.active=true;if not found then raise exception 'Produto indisponível.' using errcode='P0001';end if;
  v_subtotal:=v_subtotal+v_product.price_cents::bigint*v_quantity;
 end loop;
 if p_shipping_service like 'melhor-envio:%' then
  begin v_id:=substring(p_shipping_service from 14)::uuid;exception when others then raise exception 'Cotação inválida.' using errcode='22023';end;
  select * into v_quote from public.external_shipping_quotes q where q.id=v_id and q.customer_id=v_customer and q.address_id=p_address_id and q.items=p_items and q.expires_at>now() for update;
  if not found then raise exception 'A cotação expirou. Calcule o frete novamente.' using errcode='P0001';end if;
  delete from public.external_shipping_quotes where id=v_quote.id;
  return query select v_quote.provider,p_shipping_service,v_quote.service_name,v_quote.amount_cents,v_quote.estimated_days_min,v_quote.estimated_days_max,v_quote.metadata||jsonb_build_object('quote_id',v_quote.id,'external_service_id',v_quote.external_service_id);return;
 end if;
 if p_shipping_service<>'manual-standard' then raise exception 'Serviço de frete indisponível.' using errcode='22023';end if;
 select * into v_settings from public.store_settings where id=true;if not found or not v_settings.shipping_manual_enabled then raise exception 'Nenhuma modalidade disponível.' using errcode='P0001';end if;
 v_amount:=case when v_settings.shipping_manual_free_threshold_cents is not null and v_subtotal>=v_settings.shipping_manual_free_threshold_cents then 0 else v_settings.shipping_manual_amount_cents end;
 return query select 'manual'::text,'manual-standard'::text,v_settings.shipping_manual_service_name,v_amount,v_settings.shipping_manual_estimated_days_min,v_settings.shipping_manual_estimated_days_max,jsonb_build_object('version',1,'pricing','flat_rate');
end;$$;
revoke all on function public.calculate_customer_shipping(uuid,jsonb,text) from public,anon;grant execute on function public.calculate_customer_shipping(uuid,jsonb,text) to authenticated;
