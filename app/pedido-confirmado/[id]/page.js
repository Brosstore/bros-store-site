import { CheckCircle2, MessageCircle } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';
import Footer from '../../../components/Footer';
import Header from '../../../components/Header';
import WhatsAppButton from '../../../components/WhatsAppButton';
import { formatCartPrice } from '../../../components/cart/cartUtils';
import { getOrder } from '../../../lib/orders';
import { getStoreSettings, storeWhatsappLink } from '../../../lib/storeSettings';
import { createClient } from '../../../lib/supabase/server';

export const metadata = { title: 'Pedido confirmado | Bros Store', robots: { index: false, follow: false } };

const paymentLabels = { pix: 'Pix', dinheiro: 'Dinheiro', cartao_na_entrega: 'Cartão na entrega' };

export default async function OrderConfirmedPage({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/pedido-confirmado/${params.id}`);
  const [order, settings] = await Promise.all([getOrder(params.id), getStoreSettings()]);
  if (!order) notFound();
  const { data: address } = order.address_id ? await supabase.from('addresses').select('*').eq('id', order.address_id).eq('user_id', user.id).maybeSingle() : { data: null };
  const items = order.order_items || [];
  const whatsapp = storeWhatsappLink(settings, ['Olá! Acabei de realizar o pedido na Bros Store.', `Pedido #${order.order_number}.`, '', ...items.map((item) => `• ${item.product_name} — ${item.quantity}x ${formatCartPrice(item.unit_price)}${[item.size && `Tam. ${item.size}`, item.color && `Cor ${item.color}`].filter(Boolean).join(' · ')}`), '', `Total: ${formatCartPrice(order.total)}`].join('\n'));
  return <main><Header settings={settings}/><section className="section pt-[126px]"><div className="mx-auto max-w-3xl text-center"><CheckCircle2 size={50} className="mx-auto text-brand"/><p className="eyebrow mt-6">Pedido confirmado</p><h1 className="section-title">SEU PEDIDO FOI <span className="text-brand">RECEBIDO.</span></h1><p className="mt-5 text-lg text-zinc-400">Pedido <strong className="text-white">#{order.order_number}</strong> criado com sucesso. Em breve entraremos em contato.</p></div><div className="mx-auto mt-10 grid max-w-3xl gap-6 md:grid-cols-2"><section className="rounded-2xl border border-white/10 bg-white/[.035] p-6 text-left"><p className="eyebrow">Resumo</p><div className="space-y-3 text-sm"><p><span className="text-zinc-500">Status:</span> <strong className="capitalize">{order.status}</strong></p><p><span className="text-zinc-500">Pagamento:</span> <strong>{paymentLabels[order.payment_method] || order.payment_method}</strong></p>{items.map((item) => <div key={item.id} className="border-t border-white/10 pt-3"><strong>{item.product_name}</strong><p className="mt-1 text-zinc-500">{item.quantity}x · {[item.size && `Tam. ${item.size}`, item.color && `Cor ${item.color}`].filter(Boolean).join(' · ')}</p><p className="mt-1 font-bold text-brand">{formatCartPrice(item.subtotal)}</p></div>)}<div className="flex justify-between border-t border-white/10 pt-4 text-base"><strong>Total</strong><strong className="text-brand">{formatCartPrice(order.total)}</strong></div></div></section><section className="rounded-2xl border border-white/10 bg-white/[.035] p-6 text-left"><p className="eyebrow">Entrega</p>{address ? <div className="text-sm leading-6 text-zinc-400"><p className="font-bold text-white">{address.apelido}</p><p className="mt-3">{address.destinatario}<br/>{address.rua}, {address.numero}{address.complemento ? ` - ${address.complemento}` : ''}<br/>{address.bairro} · {address.cidade}/{address.estado}<br/>CEP {address.cep}</p></div> : <p className="text-sm text-zinc-500">Endereço indisponível.</p>}</section></div><div className="mx-auto mt-8 flex max-w-3xl flex-col gap-3 sm:flex-row"><a href="/minha-conta" className="button-dark flex-1">Ver meus pedidos</a><a href="/produtos" className="button-dark flex-1">Continuar comprando</a><a href={whatsapp} target="_blank" rel="noreferrer" className="button-primary flex-1"><MessageCircle size={16}/>Falar no WhatsApp</a></div></section><Footer settings={settings}/><WhatsAppButton settings={settings}/></main>;
}
