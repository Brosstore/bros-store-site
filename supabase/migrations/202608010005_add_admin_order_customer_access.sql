-- Permite ao administrador identificar cliente e endereço ao gerenciar pedidos.
drop policy if exists "Admins read customer profiles" on public.profile;
create policy "Admins read customer profiles" on public.profile for select to authenticated using (public.is_admin());

drop policy if exists "Admins read customer addresses" on public.addresses;
create policy "Admins read customer addresses" on public.addresses for select to authenticated using (public.is_admin());
