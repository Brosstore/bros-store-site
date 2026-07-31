import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { defaultStoreSettings } from '../../../lib/storeSettings';
import StoreSettingsForm from './StoreSettingsForm';

export const metadata = { title: 'Configurações | Painel Bros Store', robots: { index: false, follow: false } };

export default async function StoreSettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: admin } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!admin) redirect('/admin/dashboard');

  const { data: settings, error } = await supabase.from('store_settings').select('*').eq('id', true).maybeSingle();
  const value = settings || { ...defaultStoreSettings };
  const logoUrl = settings?.logo_path ? supabase.storage.from('product-images').getPublicUrl(settings.logo_path).data.publicUrl : null;
  const bannerUrl = settings?.banner_path ? supabase.storage.from('product-images').getPublicUrl(settings.banner_path).data.publicUrl : null;
  const formSettings = {
    ...value,
    storeName: value.store_name || value.storeName,
    openingHours: value.opening_hours || value.openingHours,
    logoUrl,
    bannerUrl,
  };

  return <main className="min-h-screen bg-ink px-5 py-8 text-white sm:px-8 lg:px-12"><div className="mx-auto max-w-5xl"><header className="border-b border-white/10 pb-7"><a href="/admin/dashboard" className="text-xl font-extrabold tracking-[.08em]">BROS<span className="ml-1 text-brand">STORE</span></a><p className="mt-2 text-sm text-zinc-400">Painel administrativo / Configurações</p></header><section className="py-10"><p className="eyebrow">Loja</p><h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Configurações</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Atualize os dados institucionais e as imagens usadas na sua loja.</p>{error && <p role="alert" className="mt-6 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">A tabela de configurações ainda não está disponível. Aplique a migration antes de salvar.</p>}<StoreSettingsForm settings={formSettings} /></section></div></main>;
}
