'use client';

import { useSearchParams } from 'next/navigation';
import { products } from '../data/products';
import ProductCard from './ProductCard';

const filters = [
  { label: 'Todos os produtos', value: '' },
  { label: 'Tênis', value: 'tenis' },
  { label: 'Acessórios', value: 'acessorios' },
  { label: 'Masculino', value: 'masculino' },
  { label: 'Feminino', value: 'feminino' },
];

function matchesCategory(product, category) {
  if (!category) return true;
  const normalized = category.toLowerCase();
  if (normalized === 'tenis') return product.category === 'Calçados';
  if (normalized === 'acessorios') return product.category === 'Acessórios';
  return product.category.toLowerCase() === normalized;
}

export default function Catalog() {
  const searchParams = useSearchParams();
  const requestedCategory = searchParams.get('categoria') || '';
  const activeCategory = filters.some((filter) => filter.value === requestedCategory) ? requestedCategory : '';
  const visibleProducts = products.filter((product) => matchesCategory(product, activeCategory));
  const visibleFilters = filters.filter((filter) => !filter.value || products.some((product) => matchesCategory(product, filter.value)));
  return <section id="produtos" className="bg-[#0e0e0e] py-20 sm:py-28"><div className="section"><div className="mb-10 flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow">Catálogo Bros</p><h2 className="section-title">TODOS OS<br/><span className="text-brand">PRODUTOS.</span></h2><p className="mt-4 text-sm text-zinc-400">Escolha o seu próximo destaque.</p></div><p className="font-mono text-xs text-zinc-500">[ {visibleProducts.length} ITENS ]</p></div><nav aria-label="Filtros de produtos" className="mb-9 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible">{visibleFilters.map((filter) => <a key={filter.value} href={filter.value ? `/produtos?categoria=${filter.value}` : '/produtos'} aria-current={activeCategory === filter.value ? 'page' : undefined} className={`whitespace-nowrap rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition ${activeCategory === filter.value ? 'border-brand bg-brand text-ink' : 'border-white/15 text-zinc-300 hover:border-brand hover:text-brand'}`}>{filter.label}</a>)}</nav><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{visibleProducts.map((product) => <ProductCard key={product.id} product={product}/>)}</div></div></section>;
}
