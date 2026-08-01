import { notFound, redirect } from 'next/navigation';
import { formatCartPrice } from '../../../../components/cart/cartUtils';
import { getAdminOrderDetails, isAdmin } from '../../../../lib/orders';
import { createClient } from '../../../../lib/supabase/server';
import OrderStatusForm from '../OrderStatusForm';
import PaymentActions from '../PaymentActions';

export const metadata = { title: 'Detalhes do pedido | Painel Bros Store', robots: { index: false, follow: false } };
const payments = { pix: 'Pix', dinheiro: 'Dinheiro', cartao_na_entrega: 'Cartão na entrega' };
const paymentLabels = { pendente: 'Pagamento pendente', aguardando_confirmacao: 'Aguardando confirmação', pago: 'Pago', recusado: 'Comprovante recusado' };

function normalizedProofPath(path) { return String(path || '').replace(/^payment-proofs\//, '').replace(/^\/+/, ''); }

export default async function AdminOrderDetailPage({ params }) {
  const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/admin/login?next=/admin/pedidos/${params.id}`);
  if (!await isAdmin(supabase, user.id)) redirect(`/admin/login?next=/admin/pedidos/${params.id}&unauthorized=1`);
  const order = await getAdminOrderDetails(params.id); if (!order) notFound();
  let proofUrl = null; let proofError = null; const proofPath = normalizedProofPath(order.payment_proof_path);
  if (order.payment_method === 'pix' && proofPath) {
    const { data, error } = await supabase.storage.from('payment-proofs').createSignedUrl(proofPath, 300);
    if (error || !data?.signedUrl) { console.error('[pix] signed proof URL failed', { code: error?.statusCode || error?.code, message: error?.message, details: error?.details, hint: error?.hint }); proofError = 'Não foi possível abrir o comprovante agora.'; }
    else proofUrl = data.signedUrl;
  }
  const fileName = proofPath ? proofPath.split('/').pop() : null;
  return <main className="min-h-screen bg-ink px-5 py-8 text-white sm:px-8 lg:px-12"><div className="mx-auto max-w-6xl"><header className="flex flex-wrap items-center justify-between gap-5 border-b border-white/10 pb-7"><div><a href="/admin/dashboard" className="text-xl font-extrabold tracking-[.08em]">BROS<span className="ml-1 text-brand">STORE</span></a><p className="mt-2 text-sm text-zinc-400">Painel administrativo / Pedido #{order.order_number}</p></div><a href="/admin/pedidos" className="button-dark">Voltar aos pedidos</a></header><section className="py-10"><p className="eyebrow">Pedido #{order.order_number}</p><h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">DETALHES DO <span className="text-brand">PEDIDO.</span></h1><div className="mt-8 rounded-2xl border border-white/10 bg-white/[.03] p-6"><p className="text-sm font-bold text-zinc-300">Atualizar status</p><div className="mt-4"><OrderStatusForm id={order.id} currentStatus={order.status}/></div></div><div className="mt-8 grid gap-6 lg:grid-cols-2"><section className="glass rounded-2xl p-6"><p className="eyebrow">Cliente</p><h2 className="text-xl font-extrabold">{order.customer ? `${order.customer.nome} ${order.customer.sobrenome}`.trim() : 'Cliente não identificado'}</h2><p className="mt-3 text-sm text-zinc-400">{order.customer?.telefone || 'Telefone não informado'}</p><p className="mt-5 text-sm text-zinc-400">{order.address ? `${order.address.rua}, ${order.address.numero} · ${order.address.cidade}/${order.address.estado}` : 'Endereço indisponível.'}</p></section><section className="glass rounded-2xl p-6"><p className="eyebrow">Pagamento</p><h2 className="text-xl font-extrabold">{payments[order.payment_method] || order.payment_method}</h2>{order.payment_method === 'pix' && <><p className="mt-4 text-sm font-bold text-brand">{paymentLabels[order.payment_status] || 'Pagamento pendente'}</p>{order.payment_proof_uploaded_at && <p className="mt-2 text-sm text-zinc-400">Enviado em {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(order.payment_proof_uploaded_at))}</p>}{fileName && <p className="mt-2 break-all text-xs text-zinc-500">Arquivo: {fileName}</p>}{proofUrl && <a href={proofUrl} target="_blank" rel="noreferrer" className="button-dark mt-4 px-4 py-3 text-sm">Visualizar comprovante</a>}{proofError && <p role="alert" className="mt-4 text-sm text-red-300">{proofError}</p>}{order.payment_proof_path && order.payment_status !== 'pago' && <PaymentActions orderId={order.id}/>}</>}</section></div><div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]"><section className="rounded-2xl border border-white/10 bg-white/[.025] p-6"><p className="eyebrow">Itens</p>{(order.order_items || []).map((item) => <div key={item.id} className="mt-4 flex justify-between border-t border-white/10 pt-3"><span>{item.product_name} · {item.quantity}x</span><strong className="text-brand">{formatCartPrice(item.subtotal)}</strong></div>)}</section><aside className="glass rounded-2xl p-6"><p className="eyebrow">Financeiro</p><p className="mt-3 text-sm">Total <strong className="float-right text-brand">{formatCartPrice(order.total)}</strong></p></aside></div></section></div></main>;
}
