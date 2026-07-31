drop policy if exists "Administradores gerenciam configurações da loja" on public.store_settings;

create policy "Administradores gerenciam configurações da loja"
on public.store_settings
for all
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);
