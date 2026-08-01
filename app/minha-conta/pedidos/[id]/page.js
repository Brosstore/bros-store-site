import { notFound, redirect } from 'next/navigation';
import Footer from '../../../../components/Footer';
import Header from '../../../../components/Header';
import WhatsAppButton from '../../../../components/WhatsAppButton';
import { getAllProducts } from '../../../../lib/catalog/products';
import { getOrder } from '../../../../lib/orders';
import { getStoreSettings } from '../../../../lib/storeSettings';
import { createClient } from '../../../../lib/supabase/server';
import OrderDetails from './OrderDetails';

export const metadata = { title: 'Detalhes do pedido | Bros Store', robots: { index: false, follow: false } };
export default async function CustomerOrderPage({ params }) { const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect(`/login?next=/minha-conta/pedidos/${params.id}`); const [order, settings, products] = await Promise.all([getOrder(params.id), getStoreSettings(), getAllProducts()]); if (!order || order.customer_id !== user.id) notFound(); const { data: address } = order.address_id ? await supabase.from('addresses').select('*').eq('id', order.address_id).eq('user_id', user.id).maybeSingle() : { data: null }; return <main><Header settings={settings}/><div className="pt-[78px]"><OrderDetails order={order} address={address} settings={settings} products={products}/></div><Footer settings={settings}/><WhatsAppButton settings={settings}/></main>; }
