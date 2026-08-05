alter table public.payment_attempts
  add column if not exists external_order_id text;

create unique index if not exists payment_attempts_external_order_id_key
  on public.payment_attempts (external_order_id)
  where external_order_id is not null;

alter table public.payment_attempts
  drop constraint if exists payment_attempts_external_order_id_not_blank;
alter table public.payment_attempts
  add constraint payment_attempts_external_order_id_not_blank
  check (external_order_id is null or btrim(external_order_id) <> '');

create or replace function public.save_mercado_pago_order(
  p_payment_attempt_id uuid,
  p_order_id uuid,
  p_external_order_id text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing text;
  v_requested text := nullif(btrim(coalesce(p_external_order_id, '')), '');
begin
  if p_payment_attempt_id is null or p_order_id is null or v_requested is null then
    raise exception 'Dados da order externa inválidos.' using errcode = '22023';
  end if;

  select pa.external_order_id into v_existing
  from public.payment_attempts pa
  where pa.id = p_payment_attempt_id and pa.order_id = p_order_id
  for update;

  if not found then
    raise exception 'Tentativa de pagamento não encontrada.' using errcode = 'P0002';
  end if;
  if v_existing is not null and v_existing <> v_requested then
    raise exception 'A order externa desta tentativa já foi registrada.' using errcode = 'P0001';
  end if;

  update public.payment_attempts
  set external_order_id = coalesce(external_order_id, v_requested)
  where id = p_payment_attempt_id and order_id = p_order_id;
  return coalesce(v_existing, v_requested);
end;
$$;

revoke all on function public.save_mercado_pago_order(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.save_mercado_pago_order(uuid, uuid, text) to service_role;
