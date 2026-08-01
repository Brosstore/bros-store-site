import { categories, products as localProducts } from '../../data/products.js';

const categorySlugByName = {
  'Tênis': 'tenis',
  Acessórios: 'acessorios',
  Masculino: 'masculino',
  Feminino: 'feminino',
};

const SUPABASE_BUCKET = 'product-images';
export const HOME_SHOWCASE_LIMIT = 4;

function usesSupabase() {
  return process.env.CATALOG_PROVIDER === 'supabase';
}

function matchesCategory(product, categorySlug) {
  if (!categorySlug) return true;

  const normalizedSlug = categorySlug.toLowerCase();

  if (normalizedSlug === 'tenis') return product.category === 'Calçados';
  if (normalizedSlug === 'acessorios') return product.category === 'Acessórios';

  return product.category.toLowerCase() === normalizedSlug;
}

function mapSupabaseProduct(product, imagesByProductId, variantsByProductId, supabase) {
  const images = (imagesByProductId.get(product.id) || []).map((image) =>
    supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(image.storage_path).data.publicUrl
  );

  const inventoryVariants = variantsByProductId.get(product.id) || [];
  const isAvailable = inventoryVariants.length
    ? inventoryVariants.some((variant) => variant.quantity > 0)
    : product.stock === null || product.stock === undefined || product.stock > 0;
  const stockQuantity = inventoryVariants.length ? inventoryVariants.reduce((total, variant) => total + variant.quantity, 0) : product.stock;
  const threshold = inventoryVariants.length ? Math.max(...inventoryVariants.map((variant) => variant.low_stock_threshold ?? 3)) : product.low_stock_threshold ?? 3;
  return {
    id: product.slug,
    productId: product.id,
    name: product.name,
    category: product.category_name,
    featured: product.featured,
    featuredHome: Boolean(product.featured_home),
    newArrival: Boolean(product.new_arrival),
    promotionHome: Boolean(product.promotion_home),
    heroFeature: Boolean(product.hero_feature),
    displayOrder: product.display_order ?? 0,
    price: formatPrice(product.price_cents),
    price_cents: product.price_cents,
    oldPrice: product.old_price_cents === null ? undefined : formatPrice(product.old_price_cents),
    badge: product.badge || undefined,
    brand: product.brand || undefined,
    sizes: product.sizes || [],
    colors: product.colors || [],
    description: product.description,
    images,
    stock: stockQuantity,
    lowStockThreshold: threshold,
    inventoryVariants,
    isAvailable,
    isLowStock: stockQuantity !== null && stockQuantity !== undefined && stockQuantity > 0 && stockQuantity <= threshold,
  };
}

function formatPrice(cents) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

async function getSupabaseProducts() {
  try {
    const { createPublicClient } = await import('../supabase/public.js');
    const supabase = createPublicClient();
    const { data: productRows, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (productError) throw productError;
    if (!productRows?.length) return [];

    const { data: imageRows, error: imageError } = await supabase
      .from('product_images')
      .select('product_id, storage_path, position')
      .in('product_id', productRows.map((product) => product.id))
      .order('position', { ascending: true });

    if (imageError) throw imageError;

    const { data: variantRows, error: variantError } = await supabase
      .from('inventory_variants')
      .select('id, product_id, size, color, quantity, low_stock_threshold')
      .in('product_id', productRows.map((product) => product.id));
    if (variantError && variantError.code !== 'PGRST205') throw variantError;

    const imagesByProductId = new Map();
    for (const image of imageRows || []) {
      const images = imagesByProductId.get(image.product_id) || [];
      images.push(image);
      imagesByProductId.set(image.product_id, images);
    }

    const variantsByProductId = new Map();
    for (const variant of variantRows || []) {
      const variants = variantsByProductId.get(variant.product_id) || [];
      variants.push(variant);
      variantsByProductId.set(variant.product_id, variants);
    }
    return productRows.map((product) => mapSupabaseProduct(product, imagesByProductId, variantsByProductId, supabase));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[catalog] Falha ao carregar produtos do Supabase: ${message}`);
    if (process.env.CATALOG_FALLBACK === 'local') {
      console.warn('[catalog] Usando fallback local autorizado por CATALOG_FALLBACK=local.');
      return localProducts;
    }
    throw error;
  }
}

export function filterProductsByCategory(products, categorySlug) {
  return products.filter((product) => matchesCategory(product, categorySlug));
}

export async function getAllProducts() {
  return usesSupabase() ? getSupabaseProducts() : localProducts;
}

// Mantém a seleção de destaque atual da Home (os oito primeiros produtos).
export async function getFeaturedProducts() {
  if (!usesSupabase()) return localProducts.slice(0, 8);

  const products = await getSupabaseProducts();
  return products.filter((product) => product.featured);
}

function compareDisplayOrder(first, second) {
  return (first.displayOrder ?? 0) - (second.displayOrder ?? 0) || first.name.localeCompare(second.name, 'pt-BR');
}

export function getHomeShowcases(products, limit = HOME_SHOWCASE_LIMIT) {
  const ordered = [...(products || [])].sort(compareDisplayOrder);
  const heroProduct = ordered.find((product) => product.heroFeature) || null;
  const used = new Set(heroProduct ? [heroProduct.id] : []);

  const pick = (flag) => ordered.filter((product) => product[flag] && !used.has(product.id)).slice(0, limit).map((product) => {
    used.add(product.id);
    return product;
  });

  return {
    heroProduct,
    newArrivals: pick('newArrival'),
    featured: pick('featuredHome'),
    promotions: pick('promotionHome'),
  };
}

export async function getProductBySlug(slug) {
  const products = await getAllProducts();
  return products.find((product) => product.id === slug);
}

export async function getProductsByCategory(categorySlug) {
  const products = await getAllProducts();
  return filterProductsByCategory(products, categorySlug);
}

export async function getCategories() {
  const products = await getAllProducts();

  return categories.filter(
    (category) =>
      categorySlugByName[category.name] &&
      filterProductsByCategory(products, categorySlugByName[category.name]).length > 0
  );
}

export function getCategorySlug(categoryName) {
  return categorySlugByName[categoryName];
}

export async function getRelatedProducts(slug, limit = 3) {
  const products = await getAllProducts();
  return products.filter((product) => product.id !== slug).slice(0, limit);
}
