-- RPCs administrativas de estoque. As assinaturas correspondem às chamadas de
-- app/admin/estoque/actions.js e podem ser executadas somente por administradores.

create or replace function public.set_inventory_quantity(
  p_product_id uuid,
  p_variant_id uuid,
  p_quantity integer,
  p_notes text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before integer;
  v_user uuid := auth.uid();
begin
  if v_user is null or not public.is_admin() then
    raise exception 'Sem permissão para alterar estoque.' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity < 0 then
    raise exception 'Quantidade de estoque inválida.' using errcode = '22023';
  end if;

  if p_variant_id is not null then
    select iv.quantity into v_before
    from public.inventory_variants iv
    where iv.id = p_variant_id and iv.product_id = p_product_id
    for update;

    if not found then
      raise exception 'Variação não encontrada.' using errcode = 'P0002';
    end if;

    update public.inventory_variants
    set quantity = p_quantity, updated_at = now()
    where id = p_variant_id;

    -- Edições de uma variação já existente também mantêm o total global sincronizado.
    update public.products p
    set stock = coalesce((
      select sum(iv.quantity) from public.inventory_variants iv where iv.product_id = p_product_id
    ), 0), updated_at = now()
    where p.id = p_product_id;
  else
    select p.stock into v_before
    from public.products p
    where p.id = p_product_id
    for update;

    if not found then
      raise exception 'Produto não encontrado.' using errcode = 'P0002';
    end if;

    v_before := coalesce(v_before, 0);
    update public.products
    set stock = p_quantity, updated_at = now()
    where id = p_product_id;
  end if;

  if v_before <> p_quantity then
    insert into public.stock_movements (
      product_id, variant_id, movement_type, quantity_delta,
      quantity_before, quantity_after, notes, created_by
    ) values (
      p_product_id, p_variant_id,
      case when p_quantity > v_before then 'entrada' else 'ajuste' end,
      p_quantity - v_before, v_before, p_quantity,
      nullif(trim(coalesce(p_notes, '')), ''), v_user
    );
  end if;

  return true;
end;
$$;

revoke all on function public.set_inventory_quantity(uuid, uuid, integer, text) from public;
grant execute on function public.set_inventory_quantity(uuid, uuid, integer, text) to authenticated;

create or replace function public.set_inventory_variant_quantity(
  p_product_id uuid,
  p_size text,
  p_color text,
  p_quantity integer,
  p_notes text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before integer := 0;
  v_variant_id uuid;
  v_user uuid := auth.uid();
  v_product public.products%rowtype;
begin
  if v_user is null or not public.is_admin() then
    raise exception 'Sem permissão para alterar estoque.' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity < 0 then
    raise exception 'Quantidade de estoque inválida.' using errcode = '22023';
  end if;

  select p.* into v_product
  from public.products p
  where p.id = p_product_id
  for update;

  if not found then
    raise exception 'Produto não encontrado.' using errcode = 'P0002';
  end if;
  if jsonb_array_length(v_product.sizes) > 0
    and (coalesce(p_size, '') = '' or not (v_product.sizes ? p_size)) then
    raise exception 'Tamanho inválido para este produto.' using errcode = '22023';
  end if;
  if jsonb_array_length(v_product.colors) > 0
    and (coalesce(p_color, '') = '' or not (v_product.colors ? p_color)) then
    raise exception 'Cor inválida para este produto.' using errcode = '22023';
  end if;

  select iv.id, iv.quantity into v_variant_id, v_before
  from public.inventory_variants iv
  where iv.product_id = p_product_id
    and iv.size = coalesce(p_size, '')
    and iv.color = coalesce(p_color, '')
  for update;

  if v_variant_id is null then
    insert into public.inventory_variants (product_id, size, color, quantity)
    values (p_product_id, coalesce(p_size, ''), coalesce(p_color, ''), p_quantity)
    returning id into v_variant_id;
  else
    update public.inventory_variants
    set quantity = p_quantity, updated_at = now()
    where id = v_variant_id;
  end if;

  if v_before <> p_quantity then
    insert into public.stock_movements (
      product_id, variant_id, movement_type, quantity_delta,
      quantity_before, quantity_after, notes, created_by
    ) values (
      p_product_id, v_variant_id,
      case when p_quantity > v_before then 'entrada' else 'ajuste' end,
      p_quantity - v_before, v_before, p_quantity,
      nullif(trim(coalesce(p_notes, '')), ''), v_user
    );
  end if;

  -- Para produtos com variações, o estoque global representa a soma delas.
  update public.products p
  set stock = coalesce((
    select sum(iv.quantity) from public.inventory_variants iv where iv.product_id = p_product_id
  ), 0), updated_at = now()
  where p.id = p_product_id;

  return true;
end;
$$;

revoke all on function public.set_inventory_variant_quantity(uuid, text, text, integer, text) from public;
grant execute on function public.set_inventory_variant_quantity(uuid, text, text, integer, text) to authenticated;
