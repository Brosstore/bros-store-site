'use client';

import { ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import ProductCard from './ProductCard';

export default function Products({
  products,
  id = 'destaques',
  eyebrow = 'Seleção Bros',
  title = 'DESTAQUES',
  accent = 'DA SEMANA.',
  description = 'As peças que estão definindo tendência.',
}) {
  if (!products?.length) return null;

  return (
    <section id={id} className="bg-[#0e0e0e]">
      <div className="section">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.65 }} className="mb-12 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 className="section-title">{title}<br /><span className="text-brand">{accent}</span></h2>
            {description && <p className="mt-4 text-sm text-zinc-400">{description}</p>}
          </div>
          <a href="/produtos" className="button-dark hidden sm:inline-flex">Ver coleção completa <ArrowUpRight size={15} /></a>
        </motion.div>
        <div className="grid gap-5 min-[420px]:grid-cols-2 lg:grid-cols-4">{products.map((product) => <ProductCard product={product} key={product.id} />)}</div>
      </div>
    </section>
  );
}
