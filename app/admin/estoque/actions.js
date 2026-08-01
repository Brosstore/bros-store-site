'use server';

import { revalidatePath } from 'next/cache';
import { isAdmin } from '../../../lib/orders';
import { createClient } from '../../../lib/supabase/server';

export async function setStock(input) {
  try { const supabase = createClient(); const { data: { user }, error: userError } = await supabase.auth.getUser(); if (userError || !user || !await isAdmin(supabase, user.id)) throw new Error('Você não possui permissão para alterar estoque.'); const quantity = Number(input?.quantity); if (!input?.productId || !Number.isInteger(quantity) || quantity < 0) throw new Error('Informe uma quantidade válida.'); let error; if (input.variantId) ({ error } = await supabase.rpc('set_inventory_quantity', { p_product_id: input.productId, p_variant_id: input.variantId, p_quantity: quantity, p_notes: input.notes || null })); else if (input.hasVariation) ({ error } = await supabase.rpc('set_inventory_variant_quantity', { p_product_id: input.productId, p_size: input.size || '', p_color: input.color || '', p_quantity: quantity, p_notes: input.notes || null })); else ({ error } = await supabase.rpc('set_inventory_quantity', { p_product_id: input.productId, p_variant_id: null, p_quantity: quantity, p_notes: input.notes || null })); if (error) throw new Error(error.message || 'Não foi possível atualizar o estoque.'); revalidatePath('/admin/estoque'); revalidatePath('/'); revalidatePath('/produtos'); revalidatePath(`/produto/${input.slug || ''}`); return { success: 'Estoque atualizado e movimentação registrada.' }; } catch (error) { return { error: error.message || 'Não foi possível atualizar o estoque.' }; }
}
