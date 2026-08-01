import { createClient } from './supabase/server';

async function getAuthenticatedContext() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Sua sessão expirou. Entre novamente.');
  return { supabase, user };
}

async function isAdmin(supabase, userId) {
  const { data, error } = await supabase.from('admin_users').select('user_id').eq('user_id', userId).maybeSingle();
  if (error) throw new Error('Não foi possível validar suas permissões.');
  return Boolean(data);
}

function orderSelect() {
  return '*, order_items(*)';
}

export async function getOrdersByCustomer() {
  const { supabase, user } = await getAuthenticatedContext();
  const { data, error } = await supabase
    .from('orders')
    .select(orderSelect())
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw new Error('Não foi possível carregar seus pedidos.');
  return data || [];
}

export async function getOrder(orderId) {
  const { supabase, user } = await getAuthenticatedContext();
  const admin = await isAdmin(supabase, user.id);
  let query = supabase.from('orders').select(orderSelect()).eq('id', orderId);
  if (!admin) query = query.eq('customer_id', user.id);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error('Não foi possível carregar este pedido.');
  return data || null;
}

export async function getAdminOrders() {
  const { supabase, user } = await getAuthenticatedContext();
  if (!await isAdmin(supabase, user.id)) throw new Error('Você não possui permissão para consultar pedidos.');
  const { data, error } = await supabase.from('orders').select(orderSelect()).order('created_at', { ascending: false });
  if (error) throw new Error('Não foi possível carregar os pedidos.');
  return data || [];
}
