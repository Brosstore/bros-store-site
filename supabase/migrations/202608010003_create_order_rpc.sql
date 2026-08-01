-- Criação atômica de pedidos: preços e variações são sempre validados no banco.
create or replace function public.create_customer_order(p_address_id uuid, p_payment_method text, p_notes text, p_items jsonb)
returns table(order_id uuid, order_number bigint)
language plpgsql security definer set search_path = public
as $$
declare
  v_customer_id uuid := auth.uid(); v_item jsonb; v_product public.products%rowtype;
  v_product_id uuid; v_quantity integer; v_size text; v_color text;
  v_subtotal bigint := 0; v_order_id uuid; v_order_number bigint;
begin
  if v_customer_id is null then raise exception 'Sessão expirada. Entre novamente.' using errcode = '28000'; end if;
  if p_payment_method not in ('pix', 'dinheiro', 'cartao_na_entrega') then raise exception 'Forma de pagamento inválida.' using errcode = '22023'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Seu carrinho está vazio.' using errcode = '22023'; end if;
  if not exists (select 1 from public.addresses where id = p_address_id and user_id = v_customer_id) then raise exception 'O endereço selecionado não pertence à sua conta.' using errcode = '42501'; end if;
  insert into public.orders (customer_id, address_id, payment_method, notes) values (v_customer_id, p_address_id, p_payment_method, nullif(trim(coalesce(p_notes, '')), '')) returning id, order_number into v_order_id, v_order_number;
  for v_item in select value from jsonb_array_elements(p_items) loop
    begin v_product_id := (v_item ->> 'productId')::uuid; v_quantity := (v_item ->> 'quantity')::integer;
    exception when others then raise exception 'Há um produto inválido no carrinho.' using errcode = '22023'; end;
    v_size := nullif(trim(coalesce(v_item ->> 'selectedSize', '')), ''); v_color := nullif(trim(coalesce(v_item ->> 'selectedColor', '')), '');
    if v_quantity is null or v_quantity <= 0 then raise exception 'A quantidade de cada produto deve ser maior que zero.' using errcode = '22023'; end if;
    select * into v_product from public.products where id = v_product_id and active = true for share;
    if not found then raise exception 'Um produto do carrinho não está mais disponível.' using errcode = 'P0001'; end if;
    if jsonb_array_length(v_product.sizes) > 0 and (v_size is null or not (v_product.sizes ? v_size)) then raise exception 'O tamanho escolhido não está disponível para %.', v_product.name using errcode = '22023'; end if;
    if jsonb_array_length(v_product.colors) > 0 and (v_color is null or not (v_product.colors ? v_color)) then raise exception 'A cor escolhida não está disponível para %.', v_product.name using errcode = '22023'; end if;
    insert into public.order_items (order_id, product_id, product_name, size, color, unit_price, quantity, subtotal) values (v_order_id, v_product.id, v_product.name, v_size, v_color, v_product.price_cents, v_quantity, v_product.price_cents::bigint * v_quantity);
    v_subtotal := v_subtotal + (v_product.price_cents::bigint * v_quantity);
  end loop;
  update public.orders set subtotal = v_subtotal, shipping = 0, discount = 0, total = v_subtotal where id = v_order_id;
  return query select v_order_id, v_order_number;
end;
$$;

revoke all on function public.create_customer_order(uuid, text, text, jsonb) from public;
grant execute on function public.create_customer_order(uuid, text, text, jsonb) to authenticated;
