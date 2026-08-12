'use server';

import { revalidatePath } from 'next/cache';
import { isAdmin } from '../../../lib/orders';
import { getMelhorEnvioLabelUrl, prepareMelhorEnvioShipment, purchaseMelhorEnvioShipment, syncMelhorEnvioTracking } from '../../../lib/shipping/melhor-envio-operations';
import { createClient } from '../../../lib/supabase/server';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedStatuses = new Set(['novo', 'confirmado', 'em_preparo', 'pronto_para_envio', 'enviado', 'saiu_para_entrega', 'cancelado']);

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Sua sessão expirou. Entre novamente.');
  if (!await isAdmin(supabase, user.id)) throw new Error('Você não possui permissão para gerenciar pedidos.');
  return { supabase, user };
}

function validateOrderId(orderId) {
  if (!UUID.test(String(orderId || ''))) throw new Error('Pedido inválido.');
  return orderId;
}

function revalidateOrder(orderId) {
  revalidatePath('/admin/pedidos');
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath('/minha-conta');
  revalidatePath(`/minha-conta/pedidos/${orderId}`);
  revalidatePath(`/pedido-confirmado/${orderId}`);
}

function safeLog(operation, error) {
  console.error('[logistics] operation failed', { operation, code: error?.code || 'UNKNOWN', name: error?.name || 'Error' });
}

export async function updateOrderStatus(orderId, status) {
  try {
    validateOrderId(orderId);
    if (!allowedStatuses.has(status)) throw new Error('Status inválido. O status entregue só pode ser confirmado pelo rastreamento.');
    const { supabase } = await requireAdmin();
    const { data: shipment } = await supabase.from('shipments').select('id,provider').eq('order_id', orderId).maybeSingle();
    if (shipment?.provider === 'melhor_envio' && ['enviado', 'saiu_para_entrega'].includes(status)) throw new Error('Sincronize o rastreamento do Melhor Envio para confirmar a postagem.');
    const { data, error } = await supabase.from('orders').update({ status }).eq('id', orderId).select('id').maybeSingle();
    if (error || !data) throw new Error(error?.message || 'Pedido não encontrado.');
    revalidateOrder(orderId);
    return { success: 'Status atualizado com sucesso.' };
  } catch (error) {
    safeLog('update_status', error);
    return { error: error.message || 'Não foi possível atualizar o status.' };
  }
}

export async function updatePaymentStatus(orderId, paymentStatus) {
  try {
    validateOrderId(orderId);
    if (!new Set(['pago', 'recusado']).has(paymentStatus)) throw new Error('Status de pagamento inválido.');
    const { supabase, user } = await requireAdmin();
    const values = paymentStatus === 'pago' ? { payment_status: 'pago', payment_confirmed_at: new Date().toISOString(), payment_confirmed_by: user.id, status: 'confirmado' } : { payment_status: 'recusado' };
    const { error } = await supabase.from('orders').update(values).eq('id', orderId);
    if (error) throw new Error(error.message);
    revalidateOrder(orderId);
    return { success: paymentStatus === 'pago' ? 'Pagamento confirmado.' : 'Comprovante recusado.' };
  } catch (error) { return { error: error.message || 'Não foi possível atualizar o pagamento.' }; }
}

export async function prepareShippingLabel(orderId) {
  try {
    validateOrderId(orderId); await requireAdmin();
    const result = await prepareMelhorEnvioShipment(orderId); revalidateOrder(orderId);
    return { success: result.existing ? 'A etiqueta já estava preparada.' : 'Etiqueta preparada. Revise os dados antes de comprar.' };
  } catch (error) { safeLog('prepare_label', error); return { error: error.message || 'Não foi possível preparar a etiqueta.' }; }
}

export async function purchaseShippingLabel(orderId, idempotencyKey) {
  try {
    validateOrderId(orderId); if (!UUID.test(String(idempotencyKey || ''))) throw new Error('Chave de operação inválida.'); await requireAdmin();
    const result = await purchaseMelhorEnvioShipment(orderId, idempotencyKey); revalidateOrder(orderId);
    return { success: result.existing ? 'A etiqueta já havia sido comprada.' : 'Etiqueta comprada e geração solicitada com sucesso.' };
  } catch (error) { safeLog('purchase_label', error); return { error: error.message || 'Não foi possível comprar a etiqueta.' }; }
}

export async function openShippingLabel(orderId) {
  try { validateOrderId(orderId); await requireAdmin(); return { url: await getMelhorEnvioLabelUrl(orderId) }; }
  catch (error) { safeLog('print_label', error); return { error: error.message || 'Não foi possível abrir a etiqueta.' }; }
}

export async function refreshShippingTracking(orderId) {
  try { validateOrderId(orderId); await requireAdmin(); await syncMelhorEnvioTracking(orderId); revalidateOrder(orderId); return { success: 'Rastreamento atualizado com dados do Melhor Envio.' }; }
  catch (error) { safeLog('sync_tracking', error); return { error: error.message || 'Não foi possível atualizar o rastreamento.' }; }
}
