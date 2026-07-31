import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';
import { getAllProducts } from '../lib/catalog/products.js';

const BUCKET_NAME = 'product-images';
const PUBLIC_DIRECTORY = path.join(process.cwd(), 'public');
const dryRun = process.argv.includes('--dry-run');

const categoryMap = {
  'Calçados': { slug: 'tenis', name: 'Calçados' },
  Tênis: { slug: 'tenis', name: 'Tênis' },
  Acessórios: { slug: 'acessorios', name: 'Acessórios' },
  Masculino: { slug: 'masculino', name: 'Masculino' },
  Feminino: { slug: 'feminino', name: 'Feminino' },
};

function fail(message) {
  throw new Error(message);
}

function toCategory(value) {
  const mapped = categoryMap[value];
  if (mapped) return mapped;

  const slug = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  if (!slug) fail('Categoria inválida ou ausente.');
  return { slug, name: value };
}

function priceToCents(value, label) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) fail(`${label} inválido: ${value}`);
    return Math.round(value * 100);
  }

  if (typeof value !== 'string') fail(`${label} inválido: valor ausente.`);

  const normalized = value
    .trim()
    .replace(/^R\$\s*/i, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const numericValue = Number(normalized);

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    fail(`${label} inválido: "${value}".`);
  }

  return Math.round(numericValue * 100);
}

function extensionFromSource(source) {
  try {
    const pathname = source.startsWith('http') ? new URL(source).pathname : source;
    const extension = path.extname(pathname).toLowerCase();
    return ['.avif', '.gif', '.jpeg', '.jpg', '.png', '.webp'].includes(extension)
      ? extension
      : '.jpg';
  } catch {
    return '.jpg';
  }
}

function contentTypeFromPath(filePath) {
  const contentTypes = {
    '.avif': 'image/avif',
    '.gif': 'image/gif',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
  };

  return contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function normalizeImage(image, index, slug) {
  const source = typeof image === 'string' ? image : image?.src;
  const position = typeof image === 'string' ? index : image?.position ?? index;
  const altText = typeof image === 'string' ? null : image?.alt_text ?? null;

  if (typeof source !== 'string' || !source.trim()) {
    fail(`Imagem inválida no produto "${slug}" na posição ${index}.`);
  }

  if (!Number.isInteger(position) || position < 0) {
    fail(`Posição de imagem inválida no produto "${slug}": ${position}.`);
  }

  const external = /^https?:\/\//i.test(source);
  const storagePath = `${slug}/${String(position + 1).padStart(2, '0')}${extensionFromSource(source)}`;

  return { source, position, altText, external, storagePath };
}

async function resolveLocalImage(image, slug, warnings) {
  if (image.external) return;
  if (!image.source.startsWith('/')) {
    fail(`Imagem local inválida no produto "${slug}": ${image.source}`);
  }

  const resolvedPath = path.resolve(PUBLIC_DIRECTORY, `.${image.source}`);
  const publicPrefix = `${PUBLIC_DIRECTORY}${path.sep}`;

  if (!resolvedPath.startsWith(publicPrefix)) {
    fail(`Imagem local fora de public no produto "${slug}": ${image.source}`);
  }

  try {
    await fs.access(resolvedPath);
    image.localPath = resolvedPath;
  } catch {
    const legacyPath = `${resolvedPath}${path.extname(resolvedPath)}`;

    try {
      await fs.access(legacyPath);
      image.localPath = legacyPath;
      warnings.push(
        `Imagem de "${slug}" referenciada como public${image.source}; usando o arquivo legado ${path.basename(legacyPath)}.`
      );
    } catch {
      image.skip = true;
      warnings.push(
        `Imagem local não encontrada em "${slug}": public${image.source}. Ela será ignorada na importação.`
      );
    }
  }
}

async function buildImportPlan() {
  const products = await getAllProducts();
  const slugs = new Set();
  const plan = [];
  const warnings = [];

  for (const [displayOrder, product] of products.entries()) {
    if (!product.id || typeof product.id !== 'string') {
      fail(`Produto na posição ${displayOrder} sem slug válido.`);
    }

    if (slugs.has(product.id)) fail(`Slug duplicado detectado: "${product.id}".`);
    slugs.add(product.id);

    const priceCents = priceToCents(product.price, `Preço de "${product.id}"`);
    const oldPriceCents = product.oldPrice
      ? priceToCents(product.oldPrice, `Preço antigo de "${product.id}"`)
      : null;

    if (oldPriceCents !== null && oldPriceCents < priceCents) {
      fail(`Preço antigo menor que o preço atual em "${product.id}".`);
    }

    const images = (product.images || []).map((image, index) => normalizeImage(image, index, product.id));
    const positions = new Set();

    for (const image of images) {
      if (positions.has(image.position)) {
        fail(`Posição de imagem duplicada no produto "${product.id}": ${image.position}.`);
      }
      positions.add(image.position);
      await resolveLocalImage(image, product.id, warnings);
    }

    const category = toCategory(product.category);

    plan.push({
      product: {
        name: product.name,
        slug: product.id,
        description: product.description,
        price_cents: priceCents,
        old_price_cents: oldPriceCents,
        category_slug: category.slug,
        category_name: category.name,
        brand: product.brand || null,
        badge: product.badge || null,
        // A Home atual usa os oito primeiros itens como destaque; preservamos
        // essa seleção para a futura troca de fonte do catálogo.
        featured: product.featured ?? displayOrder < 8,
        active: product.active ?? true,
        stock: product.stock ?? null,
        sizes: product.sizes || [],
        colors: product.colors || [],
        display_order: displayOrder,
      },
      images,
    });
  }

  return { plan, warnings };
}

function getServerConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    fail(
      'Para importar, defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente local. Nenhuma chave foi exibida.'
    );
  }

  return { url, serviceRoleKey };
}

function createAdminClient() {
  const { url, serviceRoleKey } = getServerConfig();

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function uploadImage(supabase, image, slug, warnings) {
  let bytes;
  let contentType;

  if (image.external) {
    const response = await fetch(image.source);
    if (!response.ok) {
      image.skip = true;
      warnings.push(
        `Imagem externa de "${slug}" não pôde ser baixada (HTTP ${response.status}) e foi ignorada.`
      );
      return false;
    }
    bytes = Buffer.from(await response.arrayBuffer());
    contentType = response.headers.get('content-type')?.split(';')[0] || contentTypeFromPath(image.storagePath);
  } else {
    bytes = await fs.readFile(image.localPath);
    contentType = contentTypeFromPath(image.localPath);
  }

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(image.storagePath, bytes, { upsert: true, contentType });

  if (error) fail(`Falha ao enviar "${image.storagePath}": ${error.message}`);
  return true;
}

async function importPlan(plan, warnings) {
  const supabase = createAdminClient();
  const productRows = plan.map(({ product }) => product);
  const { data: existingProducts, error: existingProductsError } = await supabase
    .from('products')
    .select('slug')
    .in('slug', productRows.map((product) => product.slug));

  if (existingProductsError) {
    fail(`Falha ao verificar produtos existentes: ${existingProductsError.message}`);
  }

  const existingSlugs = new Set((existingProducts || []).map((product) => product.slug));
  let uploadedImages = 0;
  const { data: storedProducts, error: productError } = await supabase
    .from('products')
    .upsert(productRows, { onConflict: 'slug' })
    .select('id, slug');

  if (productError) fail(`Falha ao importar produtos: ${productError.message}`);

  const productIds = new Map(storedProducts.map((product) => [product.slug, product.id]));
  const { data: existingImageRows, error: existingImagesError } = await supabase
    .from('product_images')
    .select('product_id, position, storage_path')
    .in('product_id', [...productIds.values()]);

  if (existingImagesError) {
    fail(`Falha ao verificar imagens existentes: ${existingImagesError.message}`);
  }

  const existingImages = new Map(
    (existingImageRows || []).map((image) => [`${image.product_id}:${image.position}`, image.storage_path])
  );
  let reusedImages = 0;

  for (const entry of plan) {
    const productId = productIds.get(entry.product.slug);
    if (!productId) fail(`O banco não retornou o UUID do produto "${entry.product.slug}".`);

    for (const image of entry.images) {
      if (image.skip) continue;
      const existingStoragePath = existingImages.get(`${productId}:${image.position}`);

      if (existingStoragePath === image.storagePath) {
        reusedImages += 1;
        continue;
      }

      const uploaded = await uploadImage(supabase, image, entry.product.slug, warnings);
      if (uploaded) uploadedImages += 1;
    }

    const imageRows = entry.images.filter((image) => !image.skip).map((image) => ({
      product_id: productId,
      storage_path: image.storagePath,
      position: image.position,
      alt_text: image.altText,
    }));

    if (imageRows.length) {
      const { error: imageError } = await supabase
        .from('product_images')
        .upsert(imageRows, { onConflict: 'product_id,position' });

      if (imageError) fail(`Falha ao sincronizar imagens de "${entry.product.slug}": ${imageError.message}`);
    }
  }

  return {
    createdProducts: plan.filter(({ product }) => !existingSlugs.has(product.slug)).length,
    updatedProducts: plan.filter(({ product }) => existingSlugs.has(product.slug)).length,
    uploadedImages,
    reusedImages,
  };
}

function printDryRun(plan, warnings) {
  console.log(`DRY RUN: ${plan.length} produtos seriam enviados via upsert por slug.`);

  for (const entry of plan) {
    console.log(`[upsert] ${entry.product.slug} — ${entry.product.name}`);
    for (const image of entry.images) {
      const origin = image.external ? 'externa: baixar e enviar' : 'local: enviar';
      const status = image.skip ? ' (ignorada: arquivo ausente)' : '';
      console.log(`  [imagem ${image.position}] ${origin} → ${image.storagePath}${status}`);
    }
  }

  if (warnings.length) {
    console.log(`Avisos de validação (${warnings.length}):`);
    warnings.forEach((warning) => console.log(`  [aviso] ${warning}`));
  }

  console.log('Nenhum dado foi gravado no PostgreSQL ou no Storage.');
}

async function main() {
  const { plan, warnings } = await buildImportPlan();

  if (dryRun) {
    printDryRun(plan, warnings);
    return;
  }

  const result = await importPlan(plan, warnings);
  warnings.forEach((warning) => console.warn(`[aviso] ${warning}`));
  console.log(`Importação concluída: ${plan.length} produtos sincronizados.`);
  console.log(`Produtos criados: ${result.createdProducts}. Produtos atualizados: ${result.updatedProducts}.`);
  console.log(`Imagens enviadas ao Storage: ${result.uploadedImages}.`);
  console.log(`Imagens já existentes/reutilizadas: ${result.reusedImages}.`);
}

main().catch((error) => {
  console.error(`Importação interrompida: ${error.message}`);
  process.exitCode = 1;
});
