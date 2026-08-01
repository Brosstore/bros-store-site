-- Cria ou ajusta uma variação de estoque de forma atômica e registra o histórico.
create or replace function public.set_inventory_variant_quantity(p_product_id uuid, p_size text, p_color text, p_quantity integer, p_notes text default null)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_before integer := 0; v_variant_id uuid; v_user uuid := auth.uid(); v_product public.products%rowtype;
begin
  if v_user is null or not public.is_admin() then raise exception 'Sem permissão para alterar estoque.' using errcode = '42501'; end if;
  if p_quantity is null or p_quantity < 0 then raise exception 'Quantidade de estoque inválida.' using errcode = '22023'; end if;
  select p.* into v_product from public.products p where p.id = p_product_id for update;
  if not found then raise exception 'Produto não encontrado.' using errcode = 'P0002'; end if;
  if jsonb_array_length(v_product.sizes) > 0 and (p_size is null or p_size = '' or not (v_product.sizes ? p_size)) then raise exception 'Tamanho inválido para este produto.' using errcode = '22023'; end if;
  if jsonb_array_length(v_product.colors) > 0 and (p_color is null or p_color = '' or not (v_product.colors ? p_color)) then raise exception 'Cor inválida para este produto.' using errcode = '22023'; end if;
  select iv.id, iv.quantity into v_variant_id, v_before from public.inventory_variants iv where iv.product_id = p_product_id and iv.size = coalesce(p_size, '') and iv.color = coalesce(p_color, '') for update;
  if v_variant_id is null then insert into public.inventory_variants (product_id, size, color, quantity) values (p_product_id, coalesce(p_size, ''), coalesce(p_color, ''), p_quantity) returning id into v_variant_id;
  else update public.inventory_variants iv set quantity = p_quantity where iv.id = v_variant_id;
  end if;
  if v_before <> p_quantity then insert into public.stock_movements (product_id, variant_id, movement_type, quantity_delta, quantity_before, quantity_after, notes, created_by) values (p_product_id, v_variant_id, case when p_quantity > v_before then 'entrada' else 'ajuste' end, p_quantity - v_before, v_before, p_quantity, nullif(trim(coalesce(p_notes, '')), ''), v_user); end if;
  return v_variant_id;
end;
$$;
revoke all on function public.set_inventory_variant_quantity(uuid, text, text, integer, text) from public;
grant execute on function public.set_inventory_variant_quantity(uuid, text, text, integer, text) to authenticated;
