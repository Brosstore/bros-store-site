'use client';

import Image from 'next/image';
import { ArrowDown, ArrowUpRight, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const reveal = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };

export default function Hero({ settings, heroProduct }) {
  const image = settings?.bannerUrl || heroProduct?.images?.[0] || 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=2000&q=90';
  const titleLines = (settings?.homeTitle || 'VISTA SUA\nATITUDE.').split(/\r?\n/).filter(Boolean);
  const titleLead = titleLines.slice(0, -1).join(' ');
  const titleAccent = titleLines.at(-1) || 'ATITUDE.';

  return (
    <section id="inicio" className="grain relative isolate min-h-[760px] overflow-hidden bg-charcoal sm:min-h-screen">
      <Image src={image} alt="Coleção streetwear da Bros Store" fill priority sizes="100vw" className="-z-20 object-cover object-center" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(8,8,8,.92)_0%,rgba(8,8,8,.64)_48%,rgba(8,8,8,.3)_100%)]" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,#080808_0%,transparent_42%)]" />

      <div className="relative mx-auto flex min-h-[760px] max-w-7xl items-center px-5 pt-[78px] sm:min-h-screen sm:px-8 lg:px-12">
        <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.12 } } }} className="max-w-3xl">
          <motion.p variants={reveal} className="eyebrow flex items-center gap-2"><Sparkles size={13} />{settings?.homeEyebrow || 'Bros Store · Streetwear'}</motion.p>
          <motion.h1 variants={reveal} transition={{ duration: 0.65 }} className="mt-5 text-[3.8rem] font-extrabold leading-[.84] tracking-[-.07em] sm:text-8xl lg:text-9xl">
            {titleLead && <>{titleLead}<br /></>}
            <span className="mt-5 inline-block text-brand">{titleAccent}</span>
          </motion.h1>
          {settings?.homeSubtitle && <motion.p variants={reveal} className="mt-6 max-w-lg text-sm font-semibold uppercase tracking-[.12em] text-brand sm:text-base">{settings.homeSubtitle}</motion.p>}
          <motion.p variants={reveal} className="mt-8 max-w-lg text-base leading-7 text-zinc-200 sm:text-lg">{settings?.homeDescription || 'Roupas, calçados e acessórios para quem vive com personalidade, estilo e atitude.'}</motion.p>
          <motion.div variants={reveal} className="mt-8 flex flex-wrap gap-3">
            <a className="button-primary" href={settings?.homePrimaryCtaUrl || '/produtos'}>{settings?.homePrimaryCtaLabel || 'Comprar agora'} <ArrowUpRight size={16} /></a>
            <a className="button-dark" href={settings?.homeSecondaryCtaUrl || '/#categorias'}>{settings?.homeSecondaryCtaLabel || 'Ver categorias'}</a>
          </motion.div>
          {heroProduct && <motion.a variants={reveal} href={`/produto/${heroProduct.id}`} className="mt-6 inline-flex items-center gap-3 rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-left transition hover:border-brand hover:bg-black/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"><span className="text-[10px] font-bold uppercase tracking-[.18em] text-brand">No Hero</span><span className="text-sm font-bold text-white">{heroProduct.name}</span><ArrowUpRight size={15} className="text-brand" /></motion.a>}
          <motion.div variants={reveal} className="mt-10 grid max-w-xl grid-cols-3 gap-2 text-[10px] font-bold uppercase tracking-wide text-zinc-200 sm:gap-5">
            <span className="flex items-center gap-2"><ShieldCheck size={15} className="text-brand" />Compra segura</span>
            <span>PIX disponível</span>
            <a className="flex items-center gap-2 hover:text-brand" href={`https://wa.me/${settings?.whatsapp || ''}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={15} className="text-brand" />WhatsApp</a>
          </motion.div>
        </motion.div>
        <a href="/#categorias" className="absolute bottom-8 right-5 hidden items-center gap-3 font-mono text-[10px] uppercase tracking-[.2em] text-zinc-300 sm:flex sm:right-8 lg:right-12">Descubra a Bros <ArrowDown size={15} className="text-brand" /></a>
      </div>
    </section>
  );
}
