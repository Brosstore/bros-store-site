import { categories as localCategories } from '../data/products';

const fallback = localCategories.map((category, index) => ({ ...category, id: `local-${index}`, slug: ['camisetas', 'bermudas', 'calcas', 'tenis', 'bones', 'acessorios'][index], isActive: true }));

export async function getPublicCategories() {
  try {
    const { createPublicClient } = await import('./supabase/public');
    const supabase = createPublicClient();
    const { data, error } = await supabase.from('categories').select('*').eq('is_active', true).order('sort_order');
    if (error || !data?.length) return fallback;
    return data.map((category, index) => ({ id: category.id, num: String(index + 1).padStart(2, '0'), name: category.name, slug: category.slug, desc: category.description || '', image: category.image_path ? supabase.storage.from('product-images').getPublicUrl(category.image_path).data.publicUrl : fallback[index % fallback.length].image, bannerPath: category.banner_path || null, isActive: category.is_active }));
  } catch { return fallback; }
}
