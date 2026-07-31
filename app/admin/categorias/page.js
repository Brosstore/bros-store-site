import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import CategoryManager from './CategoryManager';

export const metadata = { title: 'Categorias | Painel Bros Store', robots: { index: false, follow: false } };

export default async function CategoriesAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: admin } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!admin) redirect('/admin/dashboard');
  const { data, error } = await supabase.from('categories').select('*').order('sort_order');
  return <main className="min-h-screen bg-ink px-5 py-8 text-white sm:px-8 lg:px-12"><div className="mx-auto max-w-7xl"><header className="flex flex-wrap items-center justify-between gap-5 border-b border-white/10 pb-7"><div><a href="/admin/dashboard" className="text-xl font-extrabold tracking-[.08em]">BROS<span className="ml-1 text-brand">STORE</span></a><p className="mt-2 text-sm text-zinc-400">Painel administrativo / Categorias</p></div><a href="/admin/produtos" className="button-dark">Produtos</a></header><section className="py-10"><p className="eyebrow">Catálogo</p><h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Categorias</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Organize a navegação e a apresentação das categorias da loja.</p>{error ? <p role="alert" className="mt-6 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">A tabela de categorias ainda não está disponível. Aplique a migration antes de gerenciar.</p> : <CategoryManager initialCategories={data || []}/>}</section></div></main>;
}
