-- Qualify target-table columns that can collide with PL/pgSQL output variables.
create or replace function public.sync_mercado_pago_payment(
  p_external_payment_id text,
  p_external_reference text,
  p_status text,
  p_status_detail text default null,
  p_payment_method text default null,
  p_installments integer default null
)
returns table(order_id uuid, payment_attempt_id uuid, payment_status text, changed boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.payment_attempts%rowtype;
  v_order_status text;
  v_changed boolean := false;
begin
  if nullif(btrim(coalesce(p_status, '')), '') is null then
    raise exception 'Status externo inválido.' using errcode = '22023';
  end if;
  if nullif(btrim(coalesce(p_external_payment_id, '')), '') is null
    and nullif(btrim(coalesce(p_external_reference, '')), '') is null then
    raise exception 'Identificador externo ausente.' using errcode = '22023';
  end if;
  if p_installments is not null and p_installments <= 0 then
    raise exception 'Número de parcelas inválido.' using errcode = '22023';
  end if;

  select pa.* into v_attempt
  from public.payment_attempts as pa
  where (nullif(btrim(coalesce(p_external_payment_id, '')), '') is not null and pa.external_payment_id = p_external_payment_id)
     or (nullif(btrim(coalesce(p_external_reference, '')), '') is not null and pa.external_reference = p_external_reference)
  for update of pa;

  if not found then
    raise exception 'Tentativa de pagamento não encontrada.' using errcode = 'P0002';
  end if;
  if p_external_reference is not null and btrim(p_external_reference) <> '' and v_attempt.external_reference <> p_external_reference then
    raise exception 'Referência externa não corresponde à tentativa.' using errcode = '22023';
  end if;

  v_order_status := case p_status
    when 'approved' then 'aprovado'
    when 'rejected' then 'recusado'
    when 'cancelled' then 'cancelado'
    when 'refunded' then 'reembolsado'
    when 'in_process' then 'processando'
    else 'aguardando_pagamento'
  end;

  v_changed := v_attempt.external_payment_id is distinct from nullif(btrim(coalesce(p_external_payment_id, '')), '')
    or v_attempt.status is distinct from p_status
    or v_attempt.status_detail is distinct from nullif(btrim(coalesce(p_status_detail, '')), '')
    or v_attempt.payment_method is distinct from nullif(btrim(coalesce(p_payment_method, '')), '')
    or v_attempt.installments is distinct from p_installments;

  update public.payment_attempts as pa
  set external_payment_id = coalesce(nullif(btrim(coalesce(p_external_payment_id, '')), ''), pa.external_payment_id),
      status = p_status,
      status_detail = nullif(btrim(coalesce(p_status_detail, '')), ''),
      payment_method = coalesce(nullif(btrim(coalesce(p_payment_method, '')), ''), pa.payment_method),
      installments = coalesce(p_installments, pa.installments),
      last_synced_at = now()
  where pa.id = v_attempt.id;

  update public.orders as o
  set payment_status = v_order_status,
      status = case when p_status = 'approved' and o.status = 'novo' then 'confirmado' else o.status end
  where o.id = v_attempt.order_id
    and (o.payment_status is distinct from v_order_status or (p_status = 'approved' and o.status = 'novo'));

  -- Stock is intentionally untouched. Inventory is decremented only when the
  -- order is created by the existing idempotent order flow.
  return query
  select v_attempt.order_id, v_attempt.id, v_order_status, v_changed;
end;
$$;

revoke all on function public.sync_mercado_pago_payment(text, text, text, text, text, integer) from public;
grant execute on function public.sync_mercado_pago_payment(text, text, text, text, text, integer) to service_role;
