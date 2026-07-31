'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../../../lib/supabase/server';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxSize = 5 * 1024 * 1024;

async function authorized() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Sua sessão expirou. Entre novamente.');
  return supabase;
}

async function reorder(supabase, productId, imageIds) {
  for (const [index, id] of imageIds.entries()) {
    await supabase.from('product_images').update({ position: index + 1000 }).eq('id', id).eq('product_id', productId);
  }
  for (const [index, id] of imageIds.entries()) {
    await supabase.from('product_images').update({ position: index }).eq('id', id).eq('product_id', productId);
  }
}

export async function uploadProductImage(formData) {
  try {
    if (!(formData instanceof FormData)) return { error: 'Dados de upload inválidos.' };

    const productId = formData.get('productId');
    const file = formData.get('file');
    const position = Number.parseInt(formData.get('position'), 10);

    if (
      typeof productId !== 'string'
      || !productId
      || typeof File === 'undefined'
      || !(file instanceof File)
      || !allowedTypes.has(file.type)
      || file.size <= 0
      || file.size > maxSize
      || !Number.isInteger(position)
      || position < 0
    ) {
      return { error: 'Use JPG, PNG ou WEBP de até 5 MB.' };
    }

    const supabase = await authorized();
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('slug')
      .eq('id', productId)
      .maybeSingle();

    if (productError || !product) return { error: productError?.message || 'Produto não encontrado.' };

    const { data: current } = await supabase
      .from('product_images')
      .select('position')
      .eq('product_id', productId)
      .order('position', { ascending: false })
      .limit(1);
    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const storagePath = `${product.slug}/${crypto.randomUUID()}.${extension}`;
    const { error: storageError } = await supabase.storage
      .from('product-images')
      .upload(storagePath, Buffer.from(await file.arrayBuffer()), { contentType: file.type });

    if (storageError) return { error: storageError.message || 'Não foi possível enviar a imagem.' };

    const imagePosition = Math.max((current?.[0]?.position ?? -1) + 1, position);
    const { data: image, error: recordError } = await supabase
      .from('product_images')
      .insert({ product_id: productId, storage_path: storagePath, position: imagePosition })
      .select('id, storage_path, position')
      .single();

    if (recordError) {
      await supabase.storage.from('product-images').remove([storagePath]);
      return { error: recordError.message || 'Não foi possível registrar a imagem.' };
    }

    revalidatePath(`/admin/produtos/${productId}`);
    revalidatePath('/admin/produtos');
    return {
      success: true,
      image: {
        id: image.id,
        position: image.position,
        url: supabase.storage.from('product-images').getPublicUrl(image.storage_path).data.publicUrl,
      },
    };
  } catch (error) {
    return { error: error.message || 'Falha ao enviar imagem.' };
  }
}

export async function updateImageOrder({ productId, imageIds }) {
  try {
    const supabase = await authorized();
    await reorder(supabase, productId, imageIds);
    revalidatePath(`/admin/produtos/${productId}`);
    return { success: true };
  } catch (error) {
    return { error: error.message || 'Falha ao reordenar imagens.' };
  }
}

export async function deleteProductImage({ productId, imageId }) {
  try {
    const supabase = await authorized();
    const { data: image } = await supabase
      .from('product_images')
      .select('storage_path')
      .eq('id', imageId)
      .eq('product_id', productId)
      .maybeSingle();
    if (!image) return { error: 'Imagem não encontrada.' };

    const { error: storageError } = await supabase.storage.from('product-images').remove([image.storage_path]);
    if (storageError) return { error: storageError.message || 'Não foi possível remover a imagem do Storage.' };

    const { error } = await supabase.from('product_images').delete().eq('id', imageId).eq('product_id', productId);
    if (error) return { error: error.message || 'Não foi possível remover o registro da imagem.' };

    const { data: remaining } = await supabase.from('product_images').select('id').eq('product_id', productId).order('position');
    await reorder(supabase, productId, (remaining || []).map((item) => item.id));
    revalidatePath(`/admin/produtos/${productId}`);
    revalidatePath('/admin/produtos');
    return { success: true };
  } catch (error) {
    return { error: error.message || 'Falha ao excluir imagem.' };
  }
}
