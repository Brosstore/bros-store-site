import { ArchiveX, Boxes, CircleDollarSign, CreditCard, Layers3, PackagePlus, PackageX, ShoppingBag, SlidersHorizontal, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import DashboardAlert from '../../../components/admin/DashboardAlert';
import DashboardCard from '../../../components/admin/DashboardCard';
import DashboardSection from '../../../components/admin/DashboardSection';
import DashboardTable from '../../../components/admin/DashboardTable';
import AdminEmptyState from '../../../components/admin/AdminEmptyState';
import OrderStatusBadge from '../../../components/admin/OrderStatusBadge';
import PaymentStatusBadge from '../../../components/admin/PaymentStatusBadge';
import { isAdmin } from '../../../lib/orders';
import { createClient } from '../../../lib/supabase/server';

export const metadata = { title: 'Dashboard | Bros Store', robots: { index: false, follow: false } };

const money = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((value || 0) / 100);
const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const movementLabels = { entrada: 'Entrada', ajuste: 'Ajuste', saida_pedido: 'Saída por pedido' };

async function metric(query, map = (result) => result.count ?? result.data?.length ?? 0) {
  try {
    const result = await query;
    return result.error ? { value: null, unavailable: true } : { value: map(result), unavailable: false };
  } catch (error) {
    console.error('[admin/dashboard] metric unavailable', { message: error instanceof Error ? error.message : String(error) });
    return { value: null, unavailable: true };
  }
}

async function queryRows(query, operation) {
  try {
    const { data, error } = await query;
    if (error) {
      console.error('[admin/dashboard] query unavailable', { operation, code: error.code, message: error.message });
      return { rows: [], unavailable: true };
    }
    return { rows: data || [], unavailable: false };
  } catch (error) {
    console.error('[admin/dashboard] query unavailable', { operation, message: error instanceof Error ? error.message : String(error) });
    return { rows: [], unavailable: true };
  }
}

function customerName(profile) {
  const name = [profile?.nome, profile?.sobrenome].filter(Boolean).join(' ').trim();
  return name || 'Cliente não identificado';
}

function movementVariantLabel(variant) {
  return [variant?.size && `Tam. ${variant.size}`, variant?.color && `Cor ${variant.color}`].filter(Boolean).join(' · ') || 'Estoque global';
}

export default async function AdminDashboardPage() {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/admin/login?next=/admin/dashboard');

  let allowed = false;
  try {
    allowed = await isAdmin(supabase, user.id);
  } catch (error) {
    console.error('[admin/dashboard] authorization unavailable', { message: error instanceof Error ? error.message : String(error) });
  }
  if (!allowed) redirect('/admin/login?next=/admin/dashboard&unauthorized=1');

  const now = new Date();
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const month = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const [activeProducts, activeCategories, newOrders, pixAwaiting, outOfStock, lowStock, salesToday, salesMonth, recentOrdersResult, recentMovementsResult] = await Promise.all([
    metric(supabase.from('products').select('id', { count: 'exact', head: true }).eq('active', true)),
    metric(supabase.from('categories').select('id', { count: 'exact', head: true }).eq('is_active', true)),
    metric(supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'novo')),
    metric(supabase.from('orders').select('id', { count: 'exact', head: true }).eq('payment_status', 'aguardando_confirmacao')),
    metric(supabase.from('products').select('id', { count: 'exact', head: true }).eq('stock', 0)),
    metric(supabase.from('products').select('id', { count: 'exact', head: true }).gt('stock', 0).lte('stock', 3)),
    metric(supabase.from('orders').select('total').neq('status', 'cancelado').gte('created_at', day), (result) => (result.data || []).reduce((sum, order) => sum + order.total, 0)),
    metric(supabase.from('orders').select('total').neq('status', 'cancelado').gte('created_at', month), (result) => (result.data || []).reduce((sum, order) => sum + order.total, 0)),
    queryRows(supabase.from('orders').select('id, order_number, customer_id, status, payment_status, payment_method, total, created_at').order('created_at', { ascending: false }).limit(10), 'recent-orders'),
    queryRows(supabase.from('stock_movements').select('id, product_id, variant_id, movement_type, quantity_delta, created_at').order('created_at', { ascending: false }).limit(10), 'recent-stock-movements'),
  ]);

  const customerIds = [...new Set(recentOrdersResult.rows.map((order) => order.customer_id).filter(Boolean))];
  const productIds = [...new Set(recentMovementsResult.rows.map((movement) => movement.product_id).filter(Boolean))];
  const variantIds = [...new Set(recentMovementsResult.rows.map((movement) => movement.variant_id).filter(Boolean))];
  const [profilesResult, productsResult, variantsResult] = await Promise.all([
    customerIds.length ? queryRows(supabase.from('profile').select('id, nome, sobrenome').in('id', customerIds), 'recent-order-profiles') : Promise.resolve({ rows: [], unavailable: false }),
    productIds.length ? queryRows(supabase.from('products').select('id, name').in('id', productIds), 'recent-movement-products') : Promise.resolve({ rows: [], unavailable: false }),
    variantIds.length ? queryRows(supabase.from('inventory_variants').select('id, size, color').in('id', variantIds), 'recent-movement-variants') : Promise.resolve({ rows: [], unavailable: false }),
  ]);

  const profilesById = new Map(profilesResult.rows.map((profile) => [profile.id, profile]));
  const productsById = new Map(productsResult.rows.map((product) => [product.id, product]));
  const variantsById = new Map(variantsResult.rows.map((variant) => [variant.id, variant]));
  const recentOrders = recentOrdersResult.rows.map((order) => ({ ...order, customer: profilesById.get(order.customer_id) }));
  const recentMovements = recentMovementsResult.rows.map((movement) => ({ ...movement, product: productsById.get(movement.product_id), variant: variantsById.get(movement.variant_id) }));

  const operationCards = [
    { title: 'Pedidos novos', result: newOrders, icon: ShoppingBag, description: 'Pedidos recebidos e ainda não confirmados.', href: '/admin/pedidos?status=novo' },
    { title: 'PIX aguardando confirmação', result: pixAwaiting, icon: CreditCard, description: 'Comprovantes que precisam de revisão.', href: '/admin/pedidos?pagamento=aguardando_confirmacao' },
    { title: 'Produtos sem estoque', result: outOfStock, icon: PackageX, description: 'Indicador baseado no estoque global.', href: '/admin/estoque' },
    { title: 'Produtos com estoque baixo', result: lowStock, icon: TriangleAlert, description: 'Entre 1 e 3 unidades no estoque global.', href: '/admin/estoque' },
  ];
  const businessCards = [
    { title: 'Produtos ativos', result: activeProducts, icon: Boxes, description: 'Itens visíveis no catálogo público.', href: '/admin/produtos' },
    { title: 'Categorias ativas', result: activeCategories, icon: Layers3, description: 'Categorias disponíveis para a loja.', href: '/admin/categorias' },
    { title: 'Vendas do dia', result: salesToday, icon: CircleDollarSign, description: 'Pedidos não cancelados criados hoje.', href: '/admin/pedidos', currency: true },
    { title: 'Vendas do mês', result: salesMonth, icon: CircleDollarSign, description: 'Pedidos não cancelados no mês corrente.', href: '/admin/pedidos', currency: true },
  ];
  const alerts = [
    !pixAwaiting.unavailable && pixAwaiting.value > 0 && { icon: CreditCard, title: `${pixAwaiting.value} pagamento(s) PIX aguardando`, description: 'Revise os comprovantes enviados pelos clientes.', href: '/admin/pedidos?pagamento=aguardando_confirmacao', tone: 'brand' },
    !outOfStock.unavailable && outOfStock.value > 0 && { icon: ArchiveX, title: `${outOfStock.value} produto(s) sem estoque`, description: 'A quantidade informada considera apenas o estoque global.', href: '/admin/estoque', tone: 'danger' },
    !lowStock.unavailable && lowStock.value > 0 && { icon: TriangleAlert, title: `${lowStock.value} produto(s) com estoque baixo`, description: 'A quantidade informada considera apenas o estoque global.', href: '/admin/estoque', tone: 'warning' },
  ].filter(Boolean);

  return <main className="min-h-screen bg-ink px-5 py-8 text-white sm:px-8 lg:px-12"><section className="mx-auto max-w-7xl pt-5">
    <p className="eyebrow">Centro de operações</p><h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">PAINEL <span className="text-brand">ADMINISTRATIVO.</span></h1><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Acompanhe a operação da Bros Store com informações atualizadas do catálogo, pedidos e estoque.</p>

    <DashboardSection title="Ações rápidas" description="Atalhos para operações já disponíveis no painel."><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Link href="/admin/produtos/novo" className="button-primary justify-center"><PackagePlus size={16} />Novo produto</Link><div aria-disabled="true" className="flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.025] px-4 py-3 text-sm font-bold text-zinc-500" title="Pedidos são criados pelo checkout"><ShoppingBag size={16} />Novo pedido <span className="sr-only">indisponível: pedidos são criados pelo checkout</span></div><Link href="/admin/estoque" className="button-dark justify-center"><SlidersHorizontal size={16} />Gerenciar estoque</Link><Link href="/admin/pedidos?pagamento=aguardando_confirmacao" className="button-dark justify-center"><CreditCard size={16} />Pedidos PIX</Link><Link href="/admin/categorias" className="button-dark justify-center"><Layers3 size={16} />Categorias</Link><Link href="/admin/configuracoes" className="button-dark justify-center"><Boxes size={16} />Configurações</Link></div></DashboardSection>

    <DashboardSection title="Operação" description="Prioridades que exigem acompanhamento."><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{operationCards.map((card) => <DashboardCard key={card.title} {...card} value={card.result.unavailable ? null : card.result.value} unavailable={card.result.unavailable} />)}</div></DashboardSection>
    <DashboardSection title="Negócio" description="Visão consolidada do catálogo e dos pedidos não cancelados."><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{businessCards.map((card) => <DashboardCard key={card.title} {...card} value={card.result.unavailable ? null : card.currency ? money(card.result.value) : card.result.value} unavailable={card.result.unavailable} />)}</div></DashboardSection>

    <DashboardSection title="Alertas" description="Itens que precisam de atenção agora."><div className="grid gap-3 lg:grid-cols-3">{alerts.length ? alerts.map((alert) => <DashboardAlert key={alert.title} {...alert} />) : <div className="lg:col-span-3"><AdminEmptyState message="Nenhum alerta operacional no momento." /></div>}</div></DashboardSection>

    <div className="grid gap-10 xl:grid-cols-2"><DashboardSection title="Pedidos recentes" description="Últimos 10 pedidos registrados." action={<Link href="/admin/pedidos" className="text-sm font-bold text-brand hover:text-yellow-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">Ver todos</Link>}>{recentOrdersResult.unavailable || profilesResult.unavailable ? <AdminEmptyState message="Não foi possível carregar os pedidos recentes agora." /> : recentOrders.length ? <DashboardTable caption="Pedidos recentes" columns={['Nº', 'Cliente', 'Total', 'Pagamento', 'Status', '']} >{recentOrders.map((order) => <tr key={order.id} className="text-zinc-300"><td className="px-4 py-4 font-bold text-white">#{order.order_number}</td><td className="px-4 py-4">{customerName(order.customer)}</td><td className="px-4 py-4">{money(order.total)}</td><td className="px-4 py-4 capitalize">{order.payment_method || '—'}</td><td className="px-4 py-4"><div className="flex flex-wrap gap-2"><OrderStatusBadge status={order.status} /><PaymentStatusBadge status={order.payment_status} /></div></td><td className="px-4 py-4 text-right"><Link href={`/admin/pedidos/${order.id}`} className="text-xs font-bold text-brand hover:text-yellow-200">Detalhes</Link></td></tr>)}</DashboardTable> : <AdminEmptyState message="Nenhum pedido registrado ainda." />}</DashboardSection>
      <DashboardSection title="Últimas movimentações" description="Últimos 10 registros de estoque." action={<Link href="/admin/estoque" className="text-sm font-bold text-brand hover:text-yellow-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">Abrir estoque</Link>}>{recentMovementsResult.unavailable || productsResult.unavailable || variantsResult.unavailable ? <AdminEmptyState message="Não foi possível carregar as movimentações agora." /> : recentMovements.length ? <DashboardTable caption="Últimas movimentações de estoque" columns={['Produto', 'Tipo', 'Variação', 'Quantidade', 'Data']}>{recentMovements.map((movement) => <tr key={movement.id} className="text-zinc-300"><td className="px-4 py-4 font-semibold text-white">{movement.product?.name || 'Produto removido'}</td><td className="px-4 py-4">{movementLabels[movement.movement_type] || movement.movement_type}</td><td className="px-4 py-4 text-xs">{movementVariantLabel(movement.variant)}</td><td className="px-4 py-4 font-bold text-white">{movement.quantity_delta > 0 ? '+' : ''}{movement.quantity_delta}</td><td className="px-4 py-4 text-xs text-zinc-400">{dateTime.format(new Date(movement.created_at))}</td></tr>)}</DashboardTable> : <AdminEmptyState message="Nenhuma movimentação de estoque registrada ainda." />}</DashboardSection></div>
  </section></main>;
}
