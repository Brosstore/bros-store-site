'use client';
import { ArrowDown, ArrowUpRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const reveal = { hidden: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0 } };

export default function Hero() {
  return <section id="inicio" className="grain relative min-h-screen overflow-hidden bg-charcoal">
    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=2000&q=90')] bg-cover bg-center bg-fixed opacity-60" />
    <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,.72),rgba(0,0,0,.45))]" />
    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,8,8,.55)_3%,transparent_65%),linear-gradient(0deg,#080808_1%,transparent_40%)]" />
    <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-5 pt-[78px] sm:px-8 lg:px-12">
      <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: .13 } } }} className="max-w-4xl pb-5 sm:pb-0">
        <motion.p variants={reveal} transition={{ duration: .65 }} className="eyebrow flex items-center gap-2"><Sparkles size={13}/> Nova coleção • 2026</motion.p>
        <motion.h1 variants={reveal} transition={{ duration: .7, ease: [0.22,1,.36,1] }} className="mt-5 text-[3.6rem] font-extrabold leading-[.84] tracking-[-.07em] sm:text-8xl lg:text-9xl xl:text-[8.5rem]">VISTA SUA<br/><span className="mt-5 inline-block font-bold text-brand drop-shadow-[0_6px_20px_rgba(245,197,24,.22)]">ATITUDE.</span></motion.h1>
        <motion.div variants={reveal} transition={{ duration: .7, ease: [0.22,1,.36,1] }} className="mt-10 flex max-w-xl flex-wrap items-center gap-4"><p className="max-w-sm text-sm leading-6 text-zinc-200 sm:text-base">Roupas, calçados e acessórios para quem vive com personalidade, estilo e atitude.</p><a className="button-primary" href="#produtos">Comprar agora <ArrowUpRight size={16}/></a><a className="button-dark" href="#sobre">Conheça a Bros</a></motion.div>
      </motion.div>
      <a href="#categorias" className="absolute bottom-8 right-5 hidden items-center gap-3 font-mono text-[10px] uppercase tracking-[.2em] text-zinc-300 sm:flex sm:right-8 lg:right-12">Descubra a Bros <ArrowDown size={15} className="text-brand"/></a>
    </div>
  </section>;
}
