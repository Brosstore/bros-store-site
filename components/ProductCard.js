'use client';

import Image from 'next/image';
import { ArrowUpRight, Heart } from 'lucide-react';

export default function ProductCard({ product, compact = false }) {
  const imageClass = compact
    ? 'group overflow-hidden rounded-2xl bg-[#151515] transition hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,.4)]'
    : 'group overflow-hidden rounded-2xl bg-[#151515] shadow-[0_8px_25px_rgba(0,0,0,.18)] transition duration-300 hover:-translate-y-2 hover:shadow-[0_25px_50px_rgba(0,0,0,.45)]';

  return <article className={imageClass}>
    <a href={`/produto/${product.id}`} className="relative block aspect-[4/5] overflow-hidden bg-zinc-900">
      <Image src={product.images[0]} alt={product.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-contain transition duration-700 group-hover:scale-105" />
      {product.badge && <span className="absolute left-4 top-4 rounded-md bg-brand px-2.5 py-1.5 font-mono text-[9px] font-extrabold tracking-wider text-ink">{product.badge}</span>}
      {!compact && <span aria-hidden="true" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-black/35 opacity-0 backdrop-blur transition duration-300 group-hover:opacity-100"><Heart size={16}/></span>}
    </a>
    <div className="p-5">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[.14em] text-zinc-500">{product.brand || product.category}</p>
      <div className="flex items-start justify-between gap-3">
        <a href={`/produto/${product.id}`} className="font-bold leading-5 hover:text-brand">{product.name}</a>
        <span className="whitespace-nowrap text-sm font-extrabold text-brand">{product.price}</span>
      </div>
      {!compact && <div className="mt-3 flex justify-end"><a href={`/produto/${product.id}`} aria-label={`Ver ${product.name}`} className="grid h-8 w-8 place-items-center rounded-full border border-white/15 transition hover:border-brand hover:bg-brand hover:text-ink"><ArrowUpRight size={14}/></a></div>}
    </div>
  </article>;
}
