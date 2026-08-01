import { redirect } from 'next/navigation';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import WhatsAppButton from '../../components/WhatsAppButton';
import { getStoreSettings } from '../../lib/storeSettings';
import { createClient } from '../../lib/supabase/server';
import AccountManager from './AccountManager';

export const metadata = { title: 'Minha conta | Bros Store', description: 'Gerencie seus dados e endereços.', robots: { index: false, follow: false } };

export default async function AccountPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const [{ data: profile }, { data: addresses }, settings] = await Promise.all([
    supabase.from('profile').select('nome, sobrenome, telefone').eq('id', user.id).maybeSingle(),
    supabase.from('addresses').select('*').eq('user_id', user.id).order('principal', { ascending: false }).order('created_at', { ascending: false }),
    getStoreSettings(),
  ]);
  return <main><Header settings={settings}/><div className="pt-[78px]"><AccountManager user={user} profile={profile || { nome: user.user_metadata?.nome || '', sobrenome: user.user_metadata?.sobrenome || '', telefone: user.user_metadata?.telefone || '' }} addresses={addresses || []}/></div><Footer settings={settings}/><WhatsAppButton settings={settings}/></main>;
}
