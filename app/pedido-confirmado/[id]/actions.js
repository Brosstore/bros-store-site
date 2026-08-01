'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../../../lib/supabase/server';

const types = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const maxSize = 5 * 1024 * 1024;

export async function uploadPaymentProof(formData) {
  try {
    const orderId = formData.get('orderId'); const file = formData.get('file');
    if (typeof orderId !== 'string' || !(file instanceof File)) throw new Error('Dados do comprovante inválidos.');
    if (!types.has(file.type) || file.size <= 0 || file.size > maxSize) throw new Error('Envie JPG, PNG, WEBP ou PDF de até 5 MB.');
    const supabase = createClient(); const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Sua sessão expirou. Entre novamente.');
    const { data: order, error: orderError } = await supabase.from('orders').select('id,customer_id,payment_method,payment_status,payment_proof_path').eq('id', orderId).maybeSingle();
    if (orderError || !order || order.customer_id !== user.id || order.payment_method !== 'pix') throw new Error('Pedido não disponível para envio de comprovante.');
    if (order.payment_status === 'pago') throw new Error('Este pagamento já foi confirmado.');
    const extension = file.name.split('.').pop()?.toLowerCase() || (file.type === 'application/pdf' ? 'pdf' : 'jpg');
    const path = `${user.id}/${order.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('payment-proofs').upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
    if (uploadError) throw new Error(uploadError.message || 'Não foi possível enviar o comprovante.');
    const { error: submitError } = await supabase.rpc('submit_payment_proof', { p_order_id: order.id, p_storage_path: path });
    if (submitError) { await supabase.storage.from('payment-proofs').remove([path]); throw new Error(submitError.message || 'Não foi possível registrar o comprovante.'); }
    if (order.payment_proof_path) await supabase.storage.from('payment-proofs').remove([order.payment_proof_path]);
    for (const route of [`/pedido-confirmado/${order.id}`, `/minha-conta/pedidos/${order.id}`, `/admin/pedidos/${order.id}`, '/admin/pedidos']) revalidatePath(route);
    return { success: 'Comprovante enviado. Aguarde a confirmação do pagamento.' };
  } catch (error) { console.error('[pix] upload proof failed', error); return { error: error.message || 'Não foi possível enviar o comprovante.' }; }
}
