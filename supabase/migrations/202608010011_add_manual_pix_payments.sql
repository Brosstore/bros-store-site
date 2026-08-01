alter table public.orders
  add column if not exists payment_status text not null default 'pendente',
  add column if not exists payment_proof_path text,
  add column if not exists payment_proof_uploaded_at timestamptz,
  add column if not exists payment_confirmed_at timestamptz,
  add column if not exists payment_confirmed_by uuid references auth.users(id);

alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check check (payment_status in ('pendente', 'aguardando_confirmacao', 'pago', 'recusado'));
alter table public.store_settings
  add column if not exists pix_key text,
  add column if not exists pix_key_type text,
  add column if not exists pix_receiver_name text,
  add column if not exists pix_city text,
  add column if not exists pix_instructions text;
alter table public.store_settings drop constraint if exists store_settings_pix_key_type_check;
alter table public.store_settings add constraint store_settings_pix_key_type_check check (pix_key_type is null or pix_key_type in ('cpf', 'cnpj', 'email', 'telefone', 'aleatoria'));

insert into storage.buckets (id, name, public) values ('payment-proofs', 'payment-proofs', false) on conflict (id) do update set public = false;

drop policy if exists "Customers upload own payment proofs" on storage.objects;
create policy "Customers upload own payment proofs" on storage.objects for insert to authenticated with check (
  bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text and
  exists (select 1 from public.orders o where o.id::text = (storage.foldername(name))[2] and o.customer_id = auth.uid() and o.payment_method = 'pix' and o.payment_status <> 'pago')
);
drop policy if exists "Customers view own payment proofs" on storage.objects;
create policy "Customers view own payment proofs" on storage.objects for select to authenticated using (
  bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text
) ;
drop policy if exists "Customers delete own payment proofs" on storage.objects;
create policy "Customers delete own payment proofs" on storage.objects for delete to authenticated using (
  bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text and
  exists (select 1 from public.orders o where o.id::text = (storage.foldername(name))[2] and o.customer_id = auth.uid() and o.payment_status <> 'pago')
);
drop policy if exists "Admins manage payment proofs" on storage.objects;
create policy "Admins manage payment proofs" on storage.objects for all to authenticated using (
  bucket_id = 'payment-proofs' and public.is_admin()
) with check (bucket_id = 'payment-proofs' and public.is_admin());

create or replace function public.submit_payment_proof(p_order_id uuid, p_storage_path text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.customer_id <> auth.uid() then raise exception 'Pedido não encontrado.' using errcode = 'P0002'; end if;
  if v_order.payment_method <> 'pix' then raise exception 'Este pedido não usa PIX.' using errcode = '22023'; end if;
  if v_order.payment_status = 'pago' then raise exception 'O pagamento já foi confirmado.' using errcode = '22023'; end if;
  if p_storage_path !~ ('^' || auth.uid()::text || '/' || p_order_id::text || '/') then raise exception 'Caminho de comprovante inválido.' using errcode = '22023'; end if;
  update public.orders set payment_proof_path = p_storage_path, payment_proof_uploaded_at = now(), payment_status = 'aguardando_confirmacao' where id = p_order_id;
  return true;
end;
$$;
revoke all on function public.submit_payment_proof(uuid, text) from public;
grant execute on function public.submit_payment_proof(uuid, text) to authenticated;
