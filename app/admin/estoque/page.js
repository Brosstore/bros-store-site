import { redirect } from 'next/navigation';
import { Boxes } from 'lucide-react';
import InventoryManager from './InventoryManager';
import { isAdmin } from '../../../lib/orders';
import { createClient } from '../../../lib/supabase/server';

export const metadata = { title: 'Estoque | Painel Bros Store', robots: { index: false, follow: false } };

function logInventoryError(section, error) {
  console.error(`[admin/estoque] Falha ao carregar ${section}:`, error);
}

async function getProducts(supabase) {
  const complete = await supabase
    .from('products')
    .select('id,name,slug,stock,low_stock_threshold,sizes,colors')
    .order('name');

  if (!complete.error) return { rows: complete.data || [], warning: null };

  // Permite que a página continue acessível enquanto a migration de estoque é aplicada.
  logInventoryError('limite de estoque baixo dos produtos', complete.error);
  const fallback = await supabase
    .from('products')
    .select('id,name,slug,stock,sizes,colors')
    .order('name');

  if (fallback.error) {
    logInventoryError('produtos', fallback.error);
    throw new Error('Não foi possível carregar a lista de produtos do estoque.');
  }

  return {
    rows: (fallback.data || []).map((product) => ({ ...product, low_stock_threshold: 3 })),
    warning: 'O limite de estoque baixo ainda não está disponível no banco. Aplique a migration corretiva para habilitá-lo.',
  };
}

async function getSecondaryData(supabase, table, query) {
  const { data, error } = await query(supabase.from(table));
  if (error) {
    logInventoryError(table, error);
    return { rows: [], unavailable: true };
  }
  return { rows: data || [], unavailable: false };
}

export default async function AdminInventoryPage() {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError) logInventoryError('sessão administrativa', authError);
  if (!user) redirect('/admin/login?next=/admin/estoque');

  let allowed = false;
  try {
    allowed = await isAdmin(supabase, user.id);
  } catch (error) {
    logInventoryError('permissão administrativa', error);
  }
  if (!allowed) redirect('/admin/login?next=/admin/estoque&unauthorized=1');

  const productsResult = await getProducts(supabase);
  const [variantsResult, movementsResult] = await Promise.all([
    getSecondaryData(supabase, 'inventory_variants', (query) => query.select('*')),
    getSecondaryData(supabase, 'stock_movements', (query) => query.select('*').order('created_at', { ascending: false }).limit(100)),
  ]);

  const variantsByProduct = new Map();
  for (const variant of variantsResult.rows) {
    const variants = variantsByProduct.get(variant.product_id) || [];
    variants.push(variant);
    variantsByProduct.set(variant.product_id, variants);
  }

  const products = productsResult.rows.map((product) => ({
    ...product,
    stock: product.stock ?? null,
    variants: variantsByProduct.get(product.id) || [],
  }));
  const productNames = new Map(products.map((product) => [product.id, product.name]));
  const variants = new Map(variantsResult.rows.map((variant) => [variant.id, variant]));
  const movements = movementsResult.rows.map((movement) => {
    const variant = movement.variant_id ? variants.get(movement.variant_id) : null;
    return {
      ...movement,
      productName: productNames.get(movement.product_id) || 'Produto removido',
      variantLabel: variant
        ? [variant.size && `Tam. ${variant.size}`, variant.color && `Cor ${variant.color}`].filter(Boolean).join(' · ')
        : '',
    };
  });

  const warnings = [
    productsResult.warning,
    variantsResult.unavailable && 'As variações de estoque estão indisponíveis. A lista de produtos continua disponível.',
    movementsResult.unavailable && 'O histórico de movimentações está indisponível no momento.',
  ].filter(Boolean);

  return <main className="min-h-screen bg-ink px-5 py-8 text-white sm:px-8 lg:px-12"><div className="mx-auto max-w-7xl"><header className="flex flex-wrap items-center justify-between gap-5 border-b border-white/10 pb-7"><div><a href="/admin/dashboard" className="text-xl font-extrabold tracking-[.08em]">BROS<span className="ml-1 text-brand">STORE</span></a><p className="mt-2 text-sm text-zinc-400">Painel administrativo / Estoque</p></div><a href="/admin/produtos" className="button-dark">Produtos</a></header><section className="py-10"><p className="eyebrow">Operação</p><div className="flex items-center gap-3"><Boxes className="text-brand"/><h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Controle de estoque</h1></div><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Ajuste quantidades globais ou por variação. Todas as alterações ficam registradas no histórico.</p>{warnings.length ? <div role="status" className="mt-5 rounded-xl border border-brand/30 bg-brand/10 px-4 py-3 text-sm text-yellow-100">{warnings.map((warning) => <p key={warning}>{warning}</p>)}</div> : null}<InventoryManager products={products} movements={movements}/></section></div></main>;
}
