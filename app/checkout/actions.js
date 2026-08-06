'use server';

import { createClient } from '../../lib/supabase/server';

function text(formData, key) { const value = formData.get(key); return typeof value === 'string' ? value.trim() : ''; }
async function requireCustomer() { const supabase = createClient(); const { data: { user }, error } = await supabase.auth.getUser(); if (error || !user) throw new Error('Sua sessão expirou. Entre novamente.'); return { supabase, user }; }

export async function createCheckoutAddress(formData) {
  try {
    const { supabase, user } = await requireCustomer();
    const address = { apelido: text(formData, 'apelido') || 'Endereço', destinatario: text(formData, 'destinatario'), cep: text(formData, 'cep'), rua: text(formData, 'rua'), numero: text(formData, 'numero'), complemento: text(formData, 'complemento') || null, bairro: text(formData, 'bairro'), cidade: text(formData, 'cidade'), estado: text(formData, 'estado'), principal: formData.get('principal') === 'on' };
    if (Object.entries(address).some(([key, value]) => !['apelido', 'complemento', 'principal'].includes(key) && !value)) throw new Error('Preencha todos os campos obrigatórios do endereço.');
    if (address.principal) { const { error } = await supabase.from('addresses').update({ principal: false }).eq('user_id', user.id); if (error) throw error; }
    const { data, error } = await supabase.from('addresses').insert({ user_id: user.id, ...address }).select('*').single();
    if (error || !data) throw new Error(error?.message || 'Não foi possível salvar o endereço.');
    return { address: data };
  } catch (error) { return { error: error.message || 'Não foi possível salvar o endereço.' }; }
}

export async function finalizeOrder(input) {
  try {
    const { supabase } = await requireCustomer();
    if (!input || typeof input !== 'object' || !Array.isArray(input.items)) throw new Error('Dados do pedido inválidos.');
    if (!input.addressId || !['pix', 'dinheiro', 'cartao_na_entrega'].includes(input.paymentMethod)) throw new Error('Selecione endereço e forma de pagamento.');
    if (!input.items.length || input.items.length > 50) throw new Error('Seu carrinho está vazio ou possui itens inválidos.');
    const items = input.items.map((item) => ({ productId: typeof item?.productId === 'string' ? item.productId : '', selectedSize: typeof item?.selectedSize === 'string' ? item.selectedSize : '', selectedColor: typeof item?.selectedColor === 'string' ? item.selectedColor : '', quantity: Number(item?.quantity) }));
    if (items.some((item) => !item.productId || !Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > 99)) throw new Error('Há uma quantidade ou produto inválido no carrinho.');
    if (input.shippingService !== 'manual-standard') throw new Error('Selecione uma modalidade de entrega válida.');
    const { data, error } = await supabase.rpc('create_customer_order', { p_address_id: input.addressId, p_payment_method: input.paymentMethod, p_notes: typeof input.notes === 'string' ? input.notes.slice(0, 1000) : '', p_items: items, p_shipping_service: input.shippingService });
    if (error) throw new Error(error.message || 'Não foi possível finalizar o pedido.');
    const order = Array.isArray(data) ? data[0] : data;
    if (!order?.order_id) throw new Error('Não foi possível confirmar o pedido.');
    return { id: order.order_id, orderNumber: order.order_number };
  } catch (error) { return { error: error.message || 'Não foi possível finalizar o pedido. Tente novamente.' }; }
}
