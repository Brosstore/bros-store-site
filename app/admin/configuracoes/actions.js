'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../../../lib/supabase/server';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxSize = 5 * 1024 * 1024;

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Sua sessão expirou. Entre novamente.');

  const { data: admin, error: adminError } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (adminError || !admin) throw new Error('Você não possui permissão para alterar as configurações.');
  return supabase;
}

function text(formData, field) {
  const value = formData.get(field);
  return typeof value === 'string' ? value.trim() : '';
}

async function uploadAsset(supabase, file, type) {
  if (!(file instanceof File) || file.size === 0) return null;
  if (!allowedTypes.has(file.type) || file.size > maxSize) throw new Error('Logo e banner devem ser JPG, PNG ou WEBP de até 5 MB.');
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const storagePath = `settings/${type}-${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from('product-images').upload(storagePath, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
  if (error) throw new Error(error.message || `Não foi possível enviar o ${type}.`);
  return storagePath;
}

export async function saveStoreSettings(formData) {
  const uploadedPaths = [];
  try {
    if (!(formData instanceof FormData)) return { error: 'Dados inválidos.' };
    const values = {
      store_name: text(formData, 'storeName') || 'Bros Store',
      slogan: text(formData, 'slogan') || 'Vista sua atitude.',
      description: text(formData, 'description'),
      whatsapp: text(formData, 'whatsapp'),
      email: text(formData, 'email'),
      instagram: text(formData, 'instagram') || null,
      facebook: text(formData, 'facebook') || null,
      tiktok: text(formData, 'tiktok') || null,
      address: text(formData, 'address') || null,
      city: text(formData, 'city') || null,
      state: text(formData, 'state') || null,
      opening_hours: text(formData, 'openingHours') || null,
      pix_key: text(formData, 'pixKey') || null,
      pix_key_type: text(formData, 'pixKeyType') || null,
      pix_receiver_name: text(formData, 'pixReceiverName') || null,
      pix_city: text(formData, 'pixCity') || null,
      pix_instructions: text(formData, 'pixInstructions') || null,
    };
    if (!values.description || !values.whatsapp || !values.email) throw new Error('Preencha nome, slogan, descrição, WhatsApp e e-mail.');

    const supabase = await requireAdmin();
    const { data: current, error: currentError } = await supabase
      .from('store_settings')
      .select('id, logo_path, banner_path')
      .limit(1)
      .maybeSingle();
    if (currentError) throw new Error(currentError.message || 'Não foi possível carregar as configurações.');

    const logoPath = await uploadAsset(supabase, formData.get('logo'), 'logo');
    if (logoPath) uploadedPaths.push(logoPath);
    const bannerPath = await uploadAsset(supabase, formData.get('banner'), 'banner');
    if (bannerPath) uploadedPaths.push(bannerPath);
    const record = { ...values, logo_path: logoPath || current?.logo_path || null, banner_path: bannerPath || current?.banner_path || null };

    let saved;
    if (current) {
      const { data, error } = await supabase
        .from('store_settings')
        .update(record)
        .eq('id', current.id)
        .select('*')
        .maybeSingle();
      if (error || !data) throw new Error(error?.message || 'Nenhuma configuração foi atualizada.');
      saved = data;
    } else {
      const { data, error } = await supabase
        .from('store_settings')
        .insert({ id: true, ...record })
        .select('*')
        .maybeSingle();
      if (error || !data) throw new Error(error?.message || 'Não foi possível criar as configurações.');
      saved = data;
    }

    const { data: persisted, error: persistedError } = await supabase
      .from('store_settings')
      .select('id, store_name, slogan, description, whatsapp, email')
      .eq('id', saved.id)
      .maybeSingle();
    if (persistedError || !persisted || persisted.store_name !== values.store_name) throw new Error(persistedError?.message || 'Não foi possível confirmar o salvamento das configurações.');

    const warnings = [];
    for (const path of [logoPath && current?.logo_path, bannerPath && current?.banner_path].filter(Boolean)) {
      const { error } = await supabase.storage.from('product-images').remove([path]);
      if (error) { warnings.push(`O arquivo anterior não pôde ser removido: ${path}`); console.warn('[settings] arquivo anterior não removido', { path, error }); }
    }
    revalidatePath('/');
    revalidatePath('/produtos');
    revalidatePath('/admin/configuracoes');
    return { success: true, warnings };
  } catch (error) {
    console.error('[settings] falha ao salvar configurações', error);
    if (uploadedPaths.length) {
      try { const supabase = createClient(); await supabase.storage.from('product-images').remove(uploadedPaths); } catch (cleanupError) { console.error('[settings] falha ao limpar uploads', cleanupError); }
    }
    return { error: error.message || 'Não foi possível salvar as configurações.' };
  }
}
