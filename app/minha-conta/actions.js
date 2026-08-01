'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../../lib/supabase/server';

function readText(formData, key) { const value = formData.get(key); return typeof value === 'string' ? value.trim() : ''; }
async function requireCustomer() { const supabase = createClient(); const { data: { user }, error } = await supabase.auth.getUser(); if (error || !user) throw new Error('Sua sessão expirou. Entre novamente.'); return { supabase, user }; }
function invalidateAccount() { revalidatePath('/minha-conta'); }

export async function saveProfile(formData) {
  try { const { supabase, user } = await requireCustomer(); const values = { nome: readText(formData, 'nome'), sobrenome: readText(formData, 'sobrenome'), telefone: readText(formData, 'telefone') || null }; if (!values.nome || !values.sobrenome) throw new Error('Informe nome e sobrenome.'); const { error } = await supabase.from('profile').upsert({ id: user.id, ...values }, { onConflict: 'id' }); if (error) throw error; invalidateAccount(); return { success: 'Dados atualizados com sucesso.' }; } catch (error) { return { error: error.message || 'Não foi possível atualizar seus dados.' }; }
}

export async function changePassword(formData) {
  try { const { supabase } = await requireCustomer(); const password = readText(formData, 'password'); const confirmation = readText(formData, 'confirmation'); if (password.length < 6) throw new Error('A nova senha precisa ter ao menos 6 caracteres.'); if (password !== confirmation) throw new Error('A confirmação de senha não confere.'); const { error } = await supabase.auth.updateUser({ password }); if (error) throw error; return { success: 'Senha alterada com sucesso.' }; } catch (error) { return { error: error.message || 'Não foi possível alterar a senha.' }; }
}

export async function saveAddress(formData) {
  try { const { supabase, user } = await requireCustomer(); const id = readText(formData, 'id'); const values = { apelido: readText(formData, 'apelido') || 'Endereço', destinatario: readText(formData, 'destinatario'), cep: readText(formData, 'cep'), rua: readText(formData, 'rua'), numero: readText(formData, 'numero'), complemento: readText(formData, 'complemento') || null, bairro: readText(formData, 'bairro'), cidade: readText(formData, 'cidade'), estado: readText(formData, 'estado'), principal: formData.get('principal') === 'on' }; if (Object.entries(values).some(([key, value]) => !['apelido', 'complemento', 'principal'].includes(key) && !value)) throw new Error('Preencha todos os campos obrigatórios do endereço.'); if (values.principal) { const { error } = await supabase.from('addresses').update({ principal: false }).eq('user_id', user.id); if (error) throw error; } if (id) { const { error } = await supabase.from('addresses').update(values).eq('id', id).eq('user_id', user.id); if (error) throw error; } else { const { error } = await supabase.from('addresses').insert({ user_id: user.id, ...values }); if (error) throw error; } invalidateAccount(); return { success: 'Endereço salvo com sucesso.' }; } catch (error) { return { error: error.message || 'Não foi possível salvar o endereço.' }; }
}

export async function deleteAddress(addressId) {
  try { const { supabase, user } = await requireCustomer(); const { error } = await supabase.from('addresses').delete().eq('id', addressId).eq('user_id', user.id); if (error) throw error; invalidateAccount(); return { success: 'Endereço excluído com sucesso.' }; } catch (error) { return { error: error.message || 'Não foi possível excluir o endereço.' }; }
}

export async function setPrimaryAddress(addressId) {
  try { const { supabase, user } = await requireCustomer(); const { error: unsetError } = await supabase.from('addresses').update({ principal: false }).eq('user_id', user.id); if (unsetError) throw unsetError; const { error } = await supabase.from('addresses').update({ principal: true }).eq('id', addressId).eq('user_id', user.id); if (error) throw error; invalidateAccount(); return { success: 'Endereço principal atualizado.' }; } catch (error) { return { error: error.message || 'Não foi possível definir o endereço principal.' }; }
}
