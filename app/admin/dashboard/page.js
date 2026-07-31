import { Boxes, Layers3, Sparkles } from 'lucide-react';
import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';

export const metadata = {
  title: 'Dashboard | Bros Store',
  robots: { index: false, follow: false },
};

async function getDashboardMetrics(supabase) {
  const [productsResult, categoriesResult, featuredResult] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('products').select('category_slug'),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('featured', true),
  ]);

  return {
    products: productsResult.count || 0,
    categories: new Set((categoriesResult.data || []).map((product) => product.category_slug)).size,
    featured: featuredResult.count || 0,
  };
}

export default async function AdminDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/admin/login');

  const metrics = await getDashboardMetrics(supabase);
  const cards = [
    { label: 'Total de produtos', value: metrics.products, icon: Boxes },
    { label: 'Total de categorias', value: metrics.categories, icon: Layers3 },
    { label: 'Produtos em destaque', value: metrics.featured, icon: Sparkles },
  ];

  return <main className="min-h-screen bg-ink px-5 py-8 text-white sm:px-8 lg:px-12"><div className="mx-auto max-w-6xl"><header className="flex flex-wrap items-center justify-between gap-5 border-b border-white/10 pb-7"><a href="/" className="text-xl font-extrabold tracking-[.08em]">BROS<span className="ml-1 text-brand">STORE</span></a><span className="rounded-full border border-brand/30 bg-brand/10 px-3 py-1.5 text-xs font-bold text-brand">PAINEL ADMINISTRATIVO</span></header><section className="pt-12"><p className="eyebrow">Visão geral</p><h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Olá, <span className="text-brand">Bros.</span></h1><p className="mt-4 max-w-xl text-zinc-400">Acompanhe os números essenciais do seu catálogo.</p><div className="mt-7 flex flex-wrap gap-3"><a href="/admin/produtos" className="button-primary">Produtos</a><a href="/admin/configuracoes" className="button-dark">Configurações</a></div><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{cards.map(({ label, value, icon: Icon }) => <article key={label} className="glass rounded-2xl p-6"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-zinc-300">{label}</span><Icon size={20} className="text-brand" /></div><strong className="mt-8 block text-5xl font-extrabold tracking-tight">{value}</strong></article>)}</div></section></div></main>;
}
