import { createClient } from './supabase/server';

async function getAuthenticatedContext() { const supabase = createClient(); const { data: { user }, error } = await supabase.auth.getUser(); if (error || !user) throw new Error('Sua sessão expirou. Entre novamente.'); return { supabase, user }; }
export async function isAdmin(supabase, userId) { const { data, error } = await supabase.from('admin_users').select('user_id').eq('user_id', userId).maybeSingle(); if (error) throw new Error('Não foi possível validar suas permissões.'); return Boolean(data); }
async function requireAdmin() { const context = await getAuthenticatedContext(); if (!await isAdmin(context.supabase, context.user.id)) throw new Error('Você não possui permissão para consultar pedidos.'); return context; }
const orderSelect = () => '*, order_items(*)';

export async function getOrdersByCustomer() { const { supabase, user } = await getAuthenticatedContext(); const { data, error } = await supabase.from('orders').select(orderSelect()).eq('customer_id', user.id).order('created_at', { ascending: false }); if (error) throw new Error('Não foi possível carregar seus pedidos.'); return data || []; }

export async function getOrder(orderId) { const { supabase, user } = await getAuthenticatedContext(); const admin = await isAdmin(supabase, user.id); let query = supabase.from('orders').select(orderSelect()).eq('id', orderId); if (!admin) query = query.eq('customer_id', user.id); const { data, error } = await query.maybeSingle(); if (error) throw new Error('Não foi possível carregar este pedido.'); return data || null; }

export async function getAdminOrders(filters = {}) {
  const { supabase } = await requireAdmin(); let query = supabase.from('orders').select(orderSelect()).order('created_at', { ascending: false });
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.paymentStatus) query = query.eq('payment_status', filters.paymentStatus);
  if (filters.number && /^\d+$/.test(filters.number)) query = query.eq('order_number', Number(filters.number));
  if (filters.from) query = query.gte('created_at', `${filters.from}T00:00:00.000Z`);
  if (filters.to) query = query.lte('created_at', `${filters.to}T23:59:59.999Z`);
  const { data, error } = await query; if (error) throw new Error('Não foi possível carregar os pedidos.');
  const orders = data || []; const ids = [...new Set(orders.map((order) => order.customer_id))];
  const { data: profiles, error: profileError } = ids.length ? await supabase.from('profile').select('id,nome,sobrenome,telefone').in('id', ids) : { data: [], error: null };
  if (profileError) throw new Error('Não foi possível carregar os clientes dos pedidos.');
  const byId = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const normalizedSearch = String(filters.customer || '').trim().toLocaleLowerCase('pt-BR');
  return orders.map((order) => ({ ...order, customer: byId.get(order.customer_id) || null })).filter((order) => !normalizedSearch || `${order.customer?.nome || ''} ${order.customer?.sobrenome || ''}`.toLocaleLowerCase('pt-BR').includes(normalizedSearch));
}

export async function getAdminOrderDetails(orderId) {
  const { supabase } = await requireAdmin(); const { data: order, error } = await supabase.from('orders').select(orderSelect()).eq('id', orderId).maybeSingle(); if (error) throw new Error('Não foi possível carregar este pedido.'); if (!order) return null;
  const [{ data: customer }, { data: address }] = await Promise.all([supabase.from('profile').select('id,nome,sobrenome,telefone').eq('id', order.customer_id).maybeSingle(), order.address_id ? supabase.from('addresses').select('*').eq('id', order.address_id).maybeSingle() : Promise.resolve({ data: null })]);
  return { ...order, customer: customer || null, address: address || null };
}
