'use client';

import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';

export default function ProductCard({ product, compact = false }) {
  const imageClass = compact
    ? 'group overflow-hidden rounded-2xl bg-[#151515] transition hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,.4)]'
    : 'group overflow-hidden rounded-2xl bg-[#151515] shadow-[0_8px_25px_rgba(0,0,0,.18)] transition duration-300 hover:-translate-y-2 hover:shadow-[0_25px_50px_rgba(0,0,0,.45)]';

  return <article className={imageClass}>
    <a href={`/produto/${product.id}`} className="relative block aspect-[4/5] overflow-hidden bg-zinc-900">
      {product.images?.[0] ? <Image src={product.images[0]} alt={product.name} fill sizes="(max-width: 420px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-contain p-2 transition duration-700 group-hover:scale-105" /> : <div className="grid h-full place-items-center px-6 text-center text-sm font-bold text-zinc-500">Imagem do produto indisponível</div>}
      {product.badge && <span className="absolute left-4 top-4 rounded-md bg-brand px-2.5 py-1.5 font-mono text-[9px] font-extrabold tracking-wider text-ink">{product.badge}</span>}
      {product.isAvailable === false && <span className="absolute inset-x-4 bottom-4 rounded-lg bg-black/80 px-3 py-2 text-center text-[10px] font-extrabold uppercase tracking-wider text-white backdrop-blur">Produto indisponível</span>}
    </a>
    <div className="p-5">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[.14em] text-zinc-500">{product.brand || product.category}</p>
      <div className="flex items-start justify-between gap-3">
        <a href={`/produto/${product.id}`} className="line-clamp-2 font-bold leading-5 hover:text-brand">{product.name}</a>
        <span className="whitespace-nowrap text-sm font-extrabold text-brand">{product.price}</span>
      </div>
      {product.isLowStock && <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-brand">Estoque baixo</p>}
      {!compact && <div className="mt-3 flex justify-end"><a href={`/produto/${product.id}`} aria-label={`Ver ${product.name}`} className="grid h-8 w-8 place-items-center rounded-full border border-white/15 transition hover:border-brand hover:bg-brand hover:text-ink"><ArrowUpRight size={14}/></a></div>}
    </div>
  </article>;
}
