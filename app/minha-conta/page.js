import { redirect } from 'next/navigation';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import WhatsAppButton from '../../components/WhatsAppButton';
import AccountNavigation from '../../components/AccountNavigation';
import CustomerLogoutButton from '../../components/CustomerLogoutButton';
import CustomerOrders from '../../components/orders/CustomerOrders';
import { getOrdersByCustomer } from '../../lib/orders';
import { getStoreSettings } from '../../lib/storeSettings';
import { createClient } from '../../lib/supabase/server';
import AccountManager from './AccountManager';

export const metadata = { title: 'Minha conta | Bros Store', description: 'Gerencie seus dados e endereços.', robots: { index: false, follow: false } };

export default async function AccountPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const [{ data: profile }, { data: addresses }, settings, orders] = await Promise.all([
    supabase.from('profile').select('nome, sobrenome, telefone').eq('id', user.id).maybeSingle(),
    supabase.from('addresses').select('*').eq('user_id', user.id).order('principal', { ascending: false }).order('created_at', { ascending: false }),
    getStoreSettings(),
    getOrdersByCustomer(),
  ]);
  const data = profile || { nome: user.user_metadata?.nome || '', sobrenome: user.user_metadata?.sobrenome || '', telefone: user.user_metadata?.telefone || '' };

  return <main>
    <Header settings={settings} />
    <div className="pt-[78px]">
      <div className="section flex justify-end pb-0 pt-6"><CustomerLogoutButton /></div>
      <AccountNavigation />
      <AccountManager user={user} profile={data} addresses={addresses || []} />
      <section id="pedidos" className="scroll-mt-32"><CustomerOrders orders={orders} /></section>
    </div>
    <Footer settings={settings} />
    <WhatsAppButton settings={settings} />
  </main>;
}
