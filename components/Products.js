'use client';
import { ArrowUpRight, Heart, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { products } from '../data/products';

export default function Products() {
  return <section id="destaques" className="bg-[#0e0e0e]"><div className="section">
    <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .65 }} className="mb-12 flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow">Seleção Bros</p><h2 className="section-title">DESTAQUES<br/><span className="text-brand">DA SEMANA.</span></h2><p className="mt-4 text-sm text-zinc-400">As peças que estão definindo tendência.</p></div><a href="#contato" className="button-dark hidden sm:inline-flex">Ver coleção completa <ArrowUpRight size={15}/></a></motion.div>
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{products.slice(0, 8).map(({ id, name, category, price, badge, images }) => <article className="group overflow-hidden rounded-2xl bg-[#151515] shadow-[0_8px_25px_rgba(0,0,0,.18)] transition duration-300 hover:-translate-y-2 hover:shadow-[0_25px_50px_rgba(0,0,0,.45)]" key={id}>
      <a href={`/produto/${id}`} className="relative block aspect-[4/5] overflow-hidden"><img loading="lazy" src={images[0]} alt={name} className="h-full w-full object-cover transition duration-700 group-hover:scale-105"/><span className="absolute left-4 top-4 rounded-md bg-brand px-2.5 py-1.5 font-mono text-[9px] font-extrabold tracking-wider text-ink">{badge}</span><button aria-label={`Favoritar ${name}`} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-black/35 opacity-0 backdrop-blur transition duration-300 group-hover:opacity-100 hover:text-brand"><Heart size={16}/></button></a>
      <div className="p-5"><p className="mb-2 text-[10px] font-bold uppercase tracking-[.14em] text-zinc-500">{category}</p><div className="flex items-start justify-between gap-3"><a href={`/produto/${id}`} className="font-bold leading-5 hover:text-brand">{name}</a><span className="whitespace-nowrap text-sm font-extrabold text-brand">{price}</span></div><div className="mt-3 flex items-center justify-between"><span className="flex text-brand">{[1,2,3,4,5].map(item => <Star key={item} size={11} fill="currentColor"/>)}</span><a href={`/produto/${id}`} aria-label={`Ver ${name}`} className="grid h-8 w-8 place-items-center rounded-full border border-white/15 transition hover:border-brand hover:bg-brand hover:text-ink"><ArrowUpRight size={14}/></a></div></div>
    </article>)}</div>
  </div></section>;
}
