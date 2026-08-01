import { CheckCircle2, MessageCircle } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';
import Footer from '../../../components/Footer';
import Header from '../../../components/Header';
import WhatsAppButton from '../../../components/WhatsAppButton';
import { formatCartPrice } from '../../../components/cart/cartUtils';
import PixPaymentPanel from '../../../components/orders/PixPaymentPanel';
import { getOrder } from '../../../lib/orders';
import { getStoreSettings, storeWhatsappLink } from '../../../lib/storeSettings';
import { createClient } from '../../../lib/supabase/server';
export const metadata = { title: 'Pedido confirmado | Bros Store', robots: { index: false, follow: false } };
const payments = { pix: 'Pix', dinheiro: 'Dinheiro', cartao_na_entrega: 'Cartão na entrega' };
export default async function OrderConfirmedPage({ params }) {
  const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect(`/login?next=/pedido-confirmado/${params.id}`);
  const [order, settings] = await Promise.all([getOrder(params.id), getStoreSettings()]); if (!order) notFound();
  const { data: address } = order.address_id ? await supabase.from('addresses').select('*').eq('id', order.address_id).eq('user_id', user.id).maybeSingle() : { data: null };
  const whatsapp = storeWhatsappLink(settings, `Olá! Acabei de realizar o pedido #${order.order_number} na Bros Store.`);
  return <main><Header settings={settings}/><section className="section pt-[126px]"><div className="mx-auto max-w-3xl text-center"><CheckCircle2 size={50} className="mx-auto text-brand"/><p className="eyebrow mt-6">Pedido confirmado</p><h1 className="section-title">SEU PEDIDO FOI <span className="text-brand">RECEBIDO.</span></h1><p className="mt-5 text-lg text-zinc-400">Pedido <strong className="text-white">#{order.order_number}</strong> criado com sucesso.</p></div><div className="mx-auto mt-10 grid max-w-3xl gap-6 md:grid-cols-2"><section className="glass rounded-2xl p-6"><p className="eyebrow">Resumo</p>{(order.order_items || []).map((item) => <div key={item.id} className="mt-4 border-t border-white/10 pt-3 text-sm"><strong>{item.product_name}</strong><p className="text-zinc-500">{item.quantity}x · {formatCartPrice(item.subtotal)}</p></div>)}<p className="mt-5 font-extrabold text-brand">Total: {formatCartPrice(order.total)}</p></section><section className="glass rounded-2xl p-6"><p className="eyebrow">Entrega</p>{address ? <p className="mt-3 text-sm text-zinc-400">{address.rua}, {address.numero}<br/>{address.bairro} · {address.cidade}/{address.estado}</p> : <p className="mt-3 text-sm text-zinc-500">Endereço indisponível.</p>}<p className="mt-5 text-sm">Pagamento: <strong>{payments[order.payment_method] || order.payment_method}</strong></p></section></div>{order.payment_method === 'pix' && <div className="mx-auto mt-6 max-w-3xl"><PixPaymentPanel order={order} settings={settings}/></div>}<div className="mx-auto mt-8 flex max-w-3xl flex-col gap-3 sm:flex-row"><a href="/minha-conta" className="button-dark flex-1">Ver meus pedidos</a><a href="/produtos" className="button-dark flex-1">Continuar comprando</a><a href={whatsapp} target="_blank" rel="noreferrer" className="button-primary flex-1"><MessageCircle size={16}/>WhatsApp</a></div></section><Footer settings={settings}/><WhatsAppButton settings={settings}/></main>;
}
