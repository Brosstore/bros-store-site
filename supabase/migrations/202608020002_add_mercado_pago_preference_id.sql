-- Persiste somente o identificador da preferência do Mercado Pago. A migration
-- 202608020001 já está aplicada e, por isso, não é alterada por este arquivo.
alter table public.payment_attempts
  add column if not exists external_preference_id text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.payment_attempts'::regclass
      and conname = 'payment_attempts_external_preference_id_not_blank'
  ) then
    alter table public.payment_attempts
      add constraint payment_attempts_external_preference_id_not_blank
      check (
        external_preference_id is null
        or btrim(external_preference_id) <> ''
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.payment_attempts'::regclass
      and conname = 'payment_attempts_external_preference_id_key'
  ) then
    alter table public.payment_attempts
      add constraint payment_attempts_external_preference_id_key
      unique (external_preference_id);
  end if;
end;
$$;

-- Esta função é exclusiva do servidor: nenhum papel usado pelo navegador recebe
-- EXECUTE. A tentativa é travada e deve pertencer ao pedido informado, impedindo
-- associação cruzada entre pedidos. Repetir o mesmo identificador é idempotente;
-- tentar substituí-lo por outro identificador falha explicitamente.
create or replace function public.save_mercado_pago_preference(
  p_payment_attempt_id uuid,
  p_order_id uuid,
  p_external_preference_id text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_preference_id text;
  v_requested_preference_id text := nullif(btrim(coalesce(p_external_preference_id, '')), '');
begin
  if p_payment_attempt_id is null
    or p_order_id is null
    or v_requested_preference_id is null then
    raise exception 'Dados da preferência inválidos.' using errcode = '22023';
  end if;

  select pa.external_preference_id
  into v_existing_preference_id
  from public.payment_attempts pa
  where pa.id = p_payment_attempt_id
    and pa.order_id = p_order_id
  for update;

  if not found then
    raise exception 'Tentativa de pagamento não encontrada para o pedido informado.'
      using errcode = 'P0002';
  end if;

  if v_existing_preference_id is not null then
    if v_existing_preference_id <> v_requested_preference_id then
      raise exception 'A preferência desta tentativa já foi registrada.'
        using errcode = 'P0001';
    end if;

    return v_existing_preference_id;
  end if;

  update public.payment_attempts
  set external_preference_id = v_requested_preference_id
  where id = p_payment_attempt_id
    and order_id = p_order_id;

  return v_requested_preference_id;
end;
$$;

revoke all on function public.save_mercado_pago_preference(uuid, uuid, text) from public;
revoke all on function public.save_mercado_pago_preference(uuid, uuid, text) from anon, authenticated;
grant execute on function public.save_mercado_pago_preference(uuid, uuid, text) to service_role;
