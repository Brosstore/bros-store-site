'use client';
import { ArrowUpRight, Heart, Star } from 'lucide-react';
import { motion } from 'framer-motion';

const products = [
  ['Camiseta Logo Bros', 'R$ 129,90', 'NOVO', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1000&q=85'],
  ['Tênis Movimento', 'R$ 429,90', 'MAIS VENDIDO', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=85'],
  ['Moletom Atitude', 'R$ 269,90', 'PROMOÇÃO', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=1000&q=85'],
  ['Boné Assinatura', 'R$ 99,90', 'NOVO', 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=1000&q=85'],
];

export default function Products() {
  return <section id="produtos" className="bg-[#0e0e0e]"><div className="section">
    <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .65 }} className="mb-12 flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow">Seleção Bros</p><h2 className="section-title">DESTAQUES<br/><span className="text-brand">DA SEMANA.</span></h2><p className="mt-4 text-sm text-zinc-400">As peças que estão definindo tendência.</p></div><a href="#contato" className="button-dark hidden sm:inline-flex">Ver coleção completa <ArrowUpRight size={15}/></a></motion.div>
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: .15 }} variants={{ visible: { transition: { staggerChildren: .1 } } }} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{products.map(([name,price,badge,image]) => <motion.article variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } }} whileHover={{ y: -8 }} transition={{ duration: .3 }} className="group overflow-hidden rounded-2xl bg-[#151515] shadow-[0_8px_25px_rgba(0,0,0,.18)] hover:shadow-[0_25px_50px_rgba(0,0,0,.45)]" key={name}>
      <div className="relative aspect-[4/5] overflow-hidden"><img loading="lazy" src={image} alt={name} className="h-full w-full object-cover transition duration-700 group-hover:scale-105"/><span className="absolute left-4 top-4 rounded-md bg-brand px-2.5 py-1.5 font-mono text-[9px] font-extrabold tracking-wider text-ink">{badge}</span><button aria-label={`Favoritar ${name}`} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-black/35 opacity-0 backdrop-blur transition duration-300 group-hover:opacity-100 hover:text-brand"><Heart size={16}/></button></div>
      <div className="p-5"><div className="flex items-start justify-between gap-3"><h3 className="font-bold leading-5">{name}</h3><span className="whitespace-nowrap text-sm font-extrabold text-brand">{price}</span></div><div className="mt-3 flex items-center justify-between"><span className="flex text-brand">{[1,2,3,4,5].map(item => <Star key={item} size={11} fill="currentColor"/>)}</span><a target="_blank" rel="noreferrer" href={`https://wa.me/5500000000000?text=${encodeURIComponent(`Olá! Quero o ${name}.`)}`} aria-label={`Comprar ${name} pelo WhatsApp`} className="grid h-8 w-8 place-items-center rounded-full border border-white/15 transition hover:border-brand hover:bg-brand hover:text-ink"><ArrowUpRight size={14}/></a></div></div>
    </motion.article>)}</motion.div>
  </div></section>;
}
