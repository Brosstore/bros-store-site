'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../../../lib/supabase/server';
import { isAdmin } from '../../../lib/orders';

const allowedStatuses = new Set(['novo', 'confirmado', 'em_preparo', 'saiu_para_entrega', 'entregue', 'cancelado']);
export async function updateOrderStatus(orderId, status) {
  try { if (!allowedStatuses.has(status)) throw new Error('Status inválido.'); const supabase = createClient(); const { data: { user }, error: userError } = await supabase.auth.getUser(); if (userError || !user || !await isAdmin(supabase, user.id)) throw new Error('Você não possui permissão para atualizar pedidos.'); const { data, error } = await supabase.from('orders').update({ status }).eq('id', orderId).select('id').maybeSingle(); if (error || !data) throw new Error(error?.message || 'Pedido não encontrado.'); revalidatePath('/admin/pedidos'); revalidatePath(`/admin/pedidos/${orderId}`); revalidatePath('/minha-conta'); revalidatePath(`/minha-conta/pedidos/${orderId}`); revalidatePath(`/pedido-confirmado/${orderId}`); return { success: 'Status atualizado com sucesso.' }; } catch (error) { console.error('[orders] status update failed', error); return { error: error.message || 'Não foi possível atualizar o status.' }; }
}
