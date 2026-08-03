-- Mercado Pago (ambiente de teste): tentativas de pagamento idempotentes.
-- Esta migration não processa pagamentos por si só; a API do servidor deve buscar
-- a confirmação no Mercado Pago antes de chamar a RPC de sincronização.

create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null,
  idempotency_key uuid not null unique,
  external_payment_id text unique,
  external_reference text not null unique,
  status text not null,
  status_detail text,
  payment_method text,
  installments integer,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_attempts_provider_check check (provider in ('mercado_pago')),
  constraint payment_attempts_installments_check check (installments is null or installments > 0),
  constraint payment_attempts_status_not_blank check (btrim(status) <> ''),
  constraint payment_attempts_external_reference_not_blank check (btrim(external_reference) <> '')
);

-- As constraints UNIQUE já criam índices para idempotency_key, external_payment_id
-- e external_reference. Os índices abaixo cobrem as consultas não únicas.
create index if not exists payment_attempts_order_id_idx on public.payment_attempts(order_id);
create index if not exists payment_attempts_status_idx on public.payment_attempts(status);
create index if not exists payment_attempts_created_at_idx on public.payment_attempts(created_at desc);

create or replace function public.touch_payment_attempts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists payment_attempts_updated_at on public.payment_attempts;
create trigger payment_attempts_updated_at
  before update on public.payment_attempts
  for each row execute function public.touch_payment_attempts_updated_at();

-- Preserva estados do PIX manual e acrescenta somente estados necessários ao online.
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check check (
  payment_status in (
    'pendente',
    'aguardando_confirmacao',
    'pago',
    'recusado',
    'aguardando_pagamento',
    'processando',
    'aprovado',
    'cancelado',
    'reembolsado'
  )
);

-- As migrations anteriores mantêm payment_method como texto livre; esta é a
-- primeira constraint de tabela para o campo. Mantemos os métodos legados
-- aceitos pela RPC create_customer_order e incluímos os dois fluxos do Mercado
-- Pago. O campo continua aceitando NULL para preservar o schema atual.
alter table public.orders
  drop constraint if exists orders_payment_method_check;

alter table public.orders
  add constraint orders_payment_method_check
  check (
    payment_method is null
    or payment_method in (
      'pix',
      'dinheiro',
      'cartao_na_entrega',
      'mercado_pago_pix',
      'mercado_pago_cartao'
    )
  );

alter table public.payment_attempts enable row level security;

-- Clientes podem consultar apenas tentativas dos próprios pedidos. Não há políticas
-- de escrita para clientes: criação e sincronização ocorrem por RPC controlada.
drop policy if exists "Customers read own payment attempts" on public.payment_attempts;
create policy "Customers read own payment attempts"
  on public.payment_attempts for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = payment_attempts.order_id
        and o.customer_id = auth.uid()
    )
  );

drop policy if exists "Admins read payment attempts" on public.payment_attempts;
create policy "Admins read payment attempts"
  on public.payment_attempts for select to authenticated
  using (public.is_admin());

revoke insert, update, delete on public.payment_attempts from anon, authenticated;
grant select on public.payment_attempts to authenticated;
grant all on public.payment_attempts to service_role;

-- Inicia pedido e tentativa de pagamento em uma única transação.
-- Regra atual preservada: create_customer_order baixa o estoque no momento em que
-- cria o pedido. A trava consultiva e a UNIQUE de idempotency_key impedem uma nova
-- baixa quando a mesma tentativa é reenviada.
create or replace function public.start_mercado_pago_order(
  p_address_id uuid,
  p_notes text,
  p_items jsonb,
  p_idempotency_key uuid,
  p_payment_method text
)
returns table(order_id uuid, order_number bigint, payment_attempt_id uuid, external_reference text, existing boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.payment_attempts%rowtype;
  v_created_order_id uuid;
  v_created_order_number bigint;
  v_attempt_id uuid;
  v_reference text;
  v_legacy_method text;
begin
  if auth.uid() is null then
    raise exception 'Sessão expirada. Entre novamente.' using errcode = '28000';
  end if;
  if p_idempotency_key is null then
    raise exception 'Chave de idempotência inválida.' using errcode = '22023';
  end if;
  if p_payment_method not in ('mercado_pago_pix', 'mercado_pago_cartao') then
    raise exception 'Forma de pagamento online inválida.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_idempotency_key::text));

  select pa.* into v_existing
  from public.payment_attempts pa
  where pa.idempotency_key = p_idempotency_key
  for update;

  if found then
    if not exists (
      select 1
      from public.orders o
      where o.id = v_existing.order_id
        and o.customer_id = auth.uid()
    ) then
      raise exception 'Esta chave de idempotência não pertence à sua conta.'
        using errcode = '42501';
    end if;

    -- A repetição do mesmo cliente sai antes de chamar create_customer_order,
    -- portanto não cria um novo pedido nem baixa o estoque novamente.
    return query select v_existing.order_id, o.order_number, v_existing.id, v_existing.external_reference, true
      from public.orders o where o.id = v_existing.order_id;
    return;
  end if;

  -- Reaproveita integralmente a RPC de pedido existente para validar endereço,
  -- itens, preços, variações e estoque. O método temporário só permite essa RPC
  -- legada; o registro final recebe o método online no mesmo commit.
  v_legacy_method := case when p_payment_method = 'mercado_pago_pix' then 'pix' else 'cartao_na_entrega' end;
  select c.order_id, c.order_number into v_created_order_id, v_created_order_number
  from public.create_customer_order(p_address_id, v_legacy_method, p_notes, p_items) c;

  v_reference := v_created_order_id::text;
  update public.orders
  set payment_method = p_payment_method,
      payment_status = 'aguardando_pagamento'
  where id = v_created_order_id;

  insert into public.payment_attempts (
    order_id, provider, idempotency_key, external_reference, status, payment_method
  ) values (
    v_created_order_id, 'mercado_pago', p_idempotency_key, v_reference,
    'pending', p_payment_method
  ) returning id into v_attempt_id;

  return query select v_created_order_id, v_created_order_number, v_attempt_id, v_reference, false;
end;
$$;

revoke all on function public.start_mercado_pago_order(uuid, text, jsonb, uuid, text) from public;
grant execute on function public.start_mercado_pago_order(uuid, text, jsonb, uuid, text) to authenticated;

-- Atualização idempotente para uso exclusivo do endpoint de webhook no servidor.
-- O endpoint deve primeiro buscar o pagamento atualizado na API do Mercado Pago;
-- portanto esta RPC não é gravável diretamente por clientes autenticados.
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

  select * into v_attempt
  from public.payment_attempts pa
  where (nullif(btrim(coalesce(p_external_payment_id, '')), '') is not null and pa.external_payment_id = p_external_payment_id)
     or (nullif(btrim(coalesce(p_external_reference, '')), '') is not null and pa.external_reference = p_external_reference)
  for update;

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

  update public.payment_attempts
  set external_payment_id = coalesce(nullif(btrim(coalesce(p_external_payment_id, '')), ''), external_payment_id),
      status = p_status,
      status_detail = nullif(btrim(coalesce(p_status_detail, '')), ''),
      payment_method = coalesce(nullif(btrim(coalesce(p_payment_method, '')), ''), payment_method),
      installments = coalesce(p_installments, installments),
      last_synced_at = now()
  where id = v_attempt.id;

  update public.orders
  set payment_status = v_order_status,
      status = case when p_status = 'approved' and status = 'novo' then 'confirmado' else status end
  where id = v_attempt.order_id
    and (payment_status is distinct from v_order_status or (p_status = 'approved' and status = 'novo'));

  -- Não há qualquer alteração de estoque nesta RPC. A baixa ocorre somente na
  -- criação idempotente do pedido, conforme a política atual da loja.
  return query select v_attempt.order_id, v_attempt.id, v_order_status, v_changed;
end;
$$;

revoke all on function public.sync_mercado_pago_payment(text, text, text, text, text, integer) from public;
grant execute on function public.sync_mercado_pago_payment(text, text, text, text, text, integer) to service_role;
