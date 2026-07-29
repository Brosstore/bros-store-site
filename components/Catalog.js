'use client';

import { useMemo, useState } from 'react';
import { ArrowUpRight, Star } from 'lucide-react';
import { products } from '../data/products';

const filters = ['Todos', 'Adidas', 'Nike', 'New Balance', 'Mizuno', 'On Cloud', 'Outros'];

export default function Catalog() {
  const [active, setActive] = useState('Todos');
  const visibleProducts = useMemo(() => products.filter((product) => {
    if (active === 'Todos') return true;
    if (active === 'Outros') return !['Adidas', 'Nike', 'New Balance', 'Mizuno', 'On Cloud'].includes(product.brand);
    return product.brand === active;
  }), [active]);

  return <section id="produtos" className="bg-[#0e0e0e] py-20 sm:py-28"><div className="section">
    <div className="mb-10 flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow">Catálogo Bros</p><h2 className="section-title">TODOS OS<br/><span className="text-brand">PRODUTOS.</span></h2><p className="mt-4 text-sm text-zinc-400">Escolha o seu próximo destaque.</p></div><p className="font-mono text-xs text-zinc-500">[ {visibleProducts.length} ITENS ]</p></div>
    <div className="mb-9 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible">{filters.map((filter) => <button key={filter} onClick={() => setActive(filter)} className={`whitespace-nowrap rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition ${active === filter ? 'border-brand bg-brand text-ink' : 'border-white/15 text-zinc-300 hover:border-brand hover:text-brand'}`}>{filter}</button>)}</div>
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{visibleProducts.map((product) => <article key={product.id} className="group overflow-hidden rounded-2xl bg-[#151515] shadow-[0_8px_25px_rgba(0,0,0,.18)] transition duration-300 hover:-translate-y-2 hover:shadow-[0_25px_50px_rgba(0,0,0,.45)]"><a href={`/produto/${product.id}`} className="relative block aspect-[4/5] overflow-hidden"><img loading="lazy" src={product.images[0]} alt={product.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-105"/><span className="absolute left-4 top-4 rounded-md bg-brand px-2.5 py-1.5 font-mono text-[9px] font-extrabold tracking-wider text-ink">{product.badge}</span></a><div className="p-5"><p className="mb-2 text-[10px] font-bold uppercase tracking-[.14em] text-zinc-500">{product.brand || product.category}</p><div className="flex items-start justify-between gap-3"><a href={`/produto/${product.id}`} className="font-bold leading-5 hover:text-brand">{product.name}</a><span className="whitespace-nowrap text-sm font-extrabold text-brand">{product.price}</span></div><div className="mt-3 flex items-center justify-between"><span className="flex text-brand">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={11} fill="currentColor"/>)}</span><a href={`/produto/${product.id}`} aria-label={`Ver ${product.name}`} className="grid h-8 w-8 place-items-center rounded-full border border-white/15 transition hover:border-brand hover:bg-brand hover:text-ink"><ArrowUpRight size={14}/></a></div></div></article>)}</div>
  </div></section>;
}
