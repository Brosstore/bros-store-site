import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_BUCKET = 'product-images';
const KNOWN_MISSING_IMAGE = {
  slug: 'bone-assinatura',
  position: 2,
  storagePath: 'bone-assinatura/03.jpg',
};

const categoryMap = {
  'Calçados': { slug: 'tenis', name: 'Calçados' },
  Tênis: { slug: 'tenis', name: 'Tênis' },
  Acessórios: { slug: 'acessorios', name: 'Acessórios' },
  Masculino: { slug: 'masculino', name: 'Masculino' },
  Feminino: { slug: 'feminino', name: 'Feminino' },
};

function getRequiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value;
}

function priceToCents(value) {
  if (typeof value === 'number') return Math.round(value * 100);

  return Math.round(
    Number(value.trim().replace(/^R\$\s*/i, '').replace(/\./g, '').replace(',', '.')) * 100
  );
}

function extensionFromSource(source) {
  try {
    const pathname = source.startsWith('http') ? new URL(source).pathname : source;
    const extension = pathname.slice(pathname.lastIndexOf('.')).toLowerCase();
    return ['.avif', '.gif', '.jpeg', '.jpg', '.png', '.webp'].includes(extension) ? extension : '.jpg';
  } catch {
    return '.jpg';
  }
}

function mapLocalProduct(product, displayOrder) {
  const category = categoryMap[product.category] || {
    slug: product.category.toLowerCase(),
    name: product.category,
  };

  return {
    name: product.name,
    slug: product.id,
    description: product.description,
    price_cents: priceToCents(product.price),
    old_price_cents: product.oldPrice ? priceToCents(product.oldPrice) : null,
    category_slug: category.slug,
    category_name: category.name,
    brand: product.brand || null,
    badge: product.badge || null,
    featured: product.featured ?? displayOrder < 8,
    active: product.active ?? true,
    stock: product.stock ?? null,
    sizes: product.sizes || [],
    colors: product.colors || [],
    display_order: displayOrder,
    images: (product.images || []).map((source, position) => ({
      position,
      storage_path: `${product.id}/${String(position + 1).padStart(2, '0')}${extensionFromSource(source)}`,
    })),
  };
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function addDifference(differences, slug, field, expected, actual) {
  differences.push({ slug, field, expected, actual });
}

async function getLocalProducts() {
  process.env.CATALOG_PROVIDER = 'local';
  const { getAllProducts } = await import('../lib/catalog/products.js');
  const products = await getAllProducts();
  return products.map(mapLocalProduct);
}

async function getSupabaseProducts() {
  const client = createClient(
    getRequiredEnvironment('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnvironment('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data: products, error: productsError } = await client.from('products').select('*').order('display_order');
  if (productsError) throw productsError;

  const { data: images, error: imagesError } = await client
    .from('product_images')
    .select('product_id, position, storage_path')
    .order('position');
  if (imagesError) throw imagesError;

  const imagesByProductId = new Map();
  for (const image of images) {
    const productImages = imagesByProductId.get(image.product_id) || [];
    productImages.push(image);
    imagesByProductId.set(image.product_id, productImages);
  }

  return products.map((product) => ({
    ...product,
    images: (imagesByProductId.get(product.id) || []).map(({ position, storage_path }) => ({
      position,
      storage_path,
    })),
  }));
}

function compareCatalogs(localProducts, supabaseProducts) {
  const differences = [];
  const knownDifferences = [];
  const supabaseBySlug = new Map(supabaseProducts.map((product) => [product.slug, product]));
  const localSlugs = new Set(localProducts.map((product) => product.slug));

  if (localProducts.length !== supabaseProducts.length) {
    addDifference(differences, '*', 'product_count', localProducts.length, supabaseProducts.length);
  }

  for (const product of localProducts) {
    const storedProduct = supabaseBySlug.get(product.slug);
    if (!storedProduct) {
      addDifference(differences, product.slug, 'missing_product', 'presente', 'ausente');
      continue;
    }

    const fields = [
      'name',
      'description',
      'price_cents',
      'old_price_cents',
      'category_slug',
      'category_name',
      'brand',
      'badge',
      'featured',
      'active',
      'stock',
      'display_order',
    ];

    for (const field of fields) {
      if (product[field] !== storedProduct[field]) {
        addDifference(differences, product.slug, field, product[field], storedProduct[field]);
      }
    }

    for (const field of ['sizes', 'colors']) {
      if (!sameJson(product[field], storedProduct[field])) {
        addDifference(differences, product.slug, field, product[field], storedProduct[field]);
      }
    }

    const storedImagesByPosition = new Map(storedProduct.images.map((image) => [image.position, image]));
    for (const image of product.images) {
      const storedImage = storedImagesByPosition.get(image.position);
      const isKnownMissing =
        product.slug === KNOWN_MISSING_IMAGE.slug &&
        image.position === KNOWN_MISSING_IMAGE.position &&
        image.storage_path === KNOWN_MISSING_IMAGE.storagePath;

      if (!storedImage && isKnownMissing) {
        knownDifferences.push({ slug: product.slug, field: 'image', expected: image, actual: null });
      } else if (!storedImage) {
        addDifference(differences, product.slug, `image_position_${image.position}`, image, null);
      } else if (storedImage.storage_path !== image.storage_path) {
        addDifference(differences, product.slug, `image_position_${image.position}`, image, storedImage);
      }
    }

    for (const image of storedProduct.images) {
      if (!product.images.some((localImage) => localImage.position === image.position)) {
        addDifference(differences, product.slug, `unexpected_image_position_${image.position}`, null, image);
      }
    }
  }

  for (const product of supabaseProducts) {
    if (!localSlugs.has(product.slug)) {
      addDifference(differences, product.slug, 'unexpected_product', 'ausente', 'presente');
    }
  }

  return { differences, knownDifferences };
}

async function main() {
  const [localProducts, supabaseProducts] = await Promise.all([getLocalProducts(), getSupabaseProducts()]);
  const report = {
    localProductCount: localProducts.length,
    supabaseProductCount: supabaseProducts.length,
    localImageCount: localProducts.reduce((total, product) => total + product.images.length, 0),
    supabaseImageCount: supabaseProducts.reduce((total, product) => total + product.images.length, 0),
    ...compareCatalogs(localProducts, supabaseProducts),
  };

  console.log(JSON.stringify(report, null, 2));
  if (report.differences.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Comparação interrompida: ${error.message}`);
  process.exitCode = 1;
});
