'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../../../lib/supabase/server';
import { isAdmin } from '../../../lib/orders';

const allowedStatuses = new Set(['novo', 'confirmado', 'em_preparo', 'saiu_para_entrega', 'entregue', 'cancelado']);
export async function updateOrderStatus(orderId, status) {
  try { if (!allowedStatuses.has(status)) throw new Error('Status inválido.'); const supabase = createClient(); const { data: { user }, error: userError } = await supabase.auth.getUser(); if (userError || !user || !await isAdmin(supabase, user.id)) throw new Error('Você não possui permissão para atualizar pedidos.'); const { data, error } = await supabase.from('orders').update({ status }).eq('id', orderId).select('id').maybeSingle(); if (error || !data) throw new Error(error?.message || 'Pedido não encontrado.'); revalidatePath('/admin/pedidos'); revalidatePath(`/admin/pedidos/${orderId}`); revalidatePath('/minha-conta'); revalidatePath(`/minha-conta/pedidos/${orderId}`); revalidatePath(`/pedido-confirmado/${orderId}`); return { success: 'Status atualizado com sucesso.' }; } catch (error) { console.error('[orders] status update failed', error); return { error: error.message || 'Não foi possível atualizar o status.' }; }
}

export async function updatePaymentStatus(orderId, paymentStatus) {
  try { if (!new Set(['pago', 'recusado']).has(paymentStatus)) throw new Error('Status de pagamento inválido.'); const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user || !await isAdmin(supabase, user.id)) throw new Error('Você não possui permissão para atualizar pagamentos.'); const values = paymentStatus === 'pago' ? { payment_status: 'pago', payment_confirmed_at: new Date().toISOString(), payment_confirmed_by: user.id, status: 'confirmado' } : { payment_status: 'recusado' }; const { error } = await supabase.from('orders').update(values).eq('id', orderId); if (error) throw new Error(error.message); revalidatePath(`/admin/pedidos/${orderId}`); revalidatePath(`/pedido-confirmado/${orderId}`); revalidatePath(`/minha-conta/pedidos/${orderId}`); return { success: paymentStatus === 'pago' ? 'Pagamento confirmado.' : 'Comprovante recusado.' }; } catch (error) { return { error: error.message || 'Não foi possível atualizar o pagamento.' }; }
}
