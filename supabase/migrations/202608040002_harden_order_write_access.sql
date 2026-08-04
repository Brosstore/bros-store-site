-- Pedidos devem ser criados somente pelas RPCs validadas. As policies de INSERT
-- antigas permitiam que um cliente autenticado contornasse validações de preço,
-- estoque e estado enviando INSERT direto pelo PostgREST.
drop policy if exists "Customers create own orders" on public.orders;
drop policy if exists "Customers create own order items" on public.order_items;

revoke insert on table public.orders from anon, authenticated;
revoke insert on table public.order_items from anon, authenticated;

-- Leitura do próprio pedido continua protegida por RLS. Atualização e exclusão
-- continuam disponíveis apenas quando a policy administrativa autoriza.
grant select on table public.orders to authenticated;
grant select on table public.order_items to authenticated;
