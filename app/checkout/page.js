import { redirect } from 'next/navigation';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import WhatsAppButton from '../../components/WhatsAppButton';
import CheckoutProgress from '../../components/CheckoutProgress';
import { getStoreSettings } from '../../lib/storeSettings';
import { createClient } from '../../lib/supabase/server';
import CheckoutClient from './CheckoutClient';
import { getMercadoPagoConfig } from '../../lib/mercado-pago/config';

export const metadata = { title: 'Checkout | Bros Store', description: 'Finalize seu pedido com segurança.', robots: { index: false, follow: false } };
export default async function CheckoutPage() { const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect('/login?next=/checkout'); const [{ data: addresses }, settings] = await Promise.all([supabase.from('addresses').select('*').eq('user_id', user.id).order('principal', { ascending: false }).order('created_at', { ascending: false }), getStoreSettings()]); let paymentConfig = { publicKey: '', checkoutMode: 'pro' }; try { const config = getMercadoPagoConfig(); paymentConfig = { publicKey: config.publicKey, checkoutMode: config.checkoutMode }; } catch {} return <main><Header settings={settings}/><div className="pt-[78px]"><CheckoutProgress/><CheckoutClient initialAddresses={addresses || []} mercadoPagoPublicKey={paymentConfig.publicKey} mercadoPagoCheckoutMode={paymentConfig.checkoutMode}/></div><Footer settings={settings}/><WhatsAppButton settings={settings}/></main>; }
