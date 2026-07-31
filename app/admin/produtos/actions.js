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

async function authorizedAdmin() {
  const supabase = await authorized();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: admin, error } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Não foi possível validar a permissão administrativa.', error);
    throw new Error('Não foi possível validar sua permissão administrativa.');
  }
  if (!admin) throw new Error('Você não possui permissão para excluir produtos.');
  return supabase;
}

function storageObjectIsMissing(error) {
  const status = error?.statusCode || error?.status;
  return status === 404 || /not found|não encontrado|does not exist/i.test(error?.message || '');
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

export async function deleteProduct(productId) {
  try {
    if (typeof productId !== 'string' || !productId) return { error: 'Produto inválido.' };

    const supabase = await authorizedAdmin();
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, slug')
      .eq('id', productId)
      .maybeSingle();

    if (productError) {
      console.error('Erro ao buscar produto para exclusão.', productError);
      return { error: 'Não foi possível localizar o produto para exclusão.' };
    }
    if (!product) return { error: 'Produto não encontrado. Ele pode já ter sido excluído.' };

    const { data: images, error: imagesError } = await supabase
      .from('product_images')
      .select('id, storage_path')
      .eq('product_id', productId);

    if (imagesError) {
      console.error('Erro ao buscar imagens do produto para exclusão.', imagesError);
      return { error: 'Não foi possível carregar as imagens do produto.' };
    }

    const warnings = [];
    const storagePaths = [...new Set((images || []).map((image) => image.storage_path).filter(Boolean))];

    for (const storagePath of storagePaths) {
      const { error: storageError } = await supabase.storage.from('product-images').remove([storagePath]);
      if (!storageError) continue;

      if (storageObjectIsMissing(storageError)) {
        const warning = `Arquivo já inexistente no Storage: ${storagePath}`;
        warnings.push(warning);
        console.warn(warning);
        continue;
      }

      console.error('Falha parcial ao remover arquivo do Storage.', { storagePath, storageError });
      return {
        error: 'Não foi possível remover todas as imagens do Storage. O produto não foi excluído.',
        warnings,
      };
    }

    const { error: imageDeleteError } = await supabase
      .from('product_images')
      .delete()
      .eq('product_id', productId);
    if (imageDeleteError) {
      console.error('Falha ao apagar registros de imagens do produto.', imageDeleteError);
      return {
        error: 'As imagens foram processadas, mas não foi possível remover seus registros. O produto não foi excluído.',
        warnings,
      };
    }

    const { data: deletedProduct, error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)
      .select('id')
      .maybeSingle();
    if (deleteError || !deletedProduct) {
      console.error('Falha ao apagar produto.', deleteError || new Error('Nenhuma linha removida.'));
      return {
        error: 'Os registros de imagens foram removidos, mas não foi possível excluir o produto.',
        warnings,
      };
    }

    revalidatePath('/admin/produtos');
    revalidatePath('/produtos');
    revalidatePath(`/produto/${product.slug}`);
    return { success: true, warnings };
  } catch (error) {
    console.error('Erro inesperado durante a exclusão do produto.', error);
    return { error: error.message || 'Não foi possível excluir o produto.' };
  }
}
