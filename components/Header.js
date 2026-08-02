'use client';

import { ArrowUpRight, Menu, ShoppingBag, ShoppingCart, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useCart } from './cart/CartContext';
import CustomerAuthLinks from './CustomerAuthLinks';

const desktopLinks = [['Início', '/'], ['Produtos', '/produtos'], ['Categorias', '/#categorias'], ['Sobre', '/#sobre'], ['Contato', '/#contato']];
const mobileLinks = [['Início', '/'], ['Produtos', '/produtos'], ['Masculino', '/produtos?categoria=masculino'], ['Feminino', '/produtos?categoria=feminino'], ['Calçados', '/produtos?categoria=tenis'], ['Acessórios', '/produtos?categoria=acessorios'], ['Contato', '/#contato']];

export default function Header({ settings }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { openCart, totalQuantity, hydrated } = useCart();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 28);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${scrolled ? 'bg-ink/95 shadow-[0_8px_30px_rgba(0,0,0,.22)] backdrop-blur-xl' : 'bg-transparent'}`}>
    <div className={`mx-auto flex h-[78px] max-w-7xl items-center justify-between px-5 transition-colors sm:px-8 lg:px-12 ${scrolled ? 'border-b border-white/10' : ''}`}>
      <a href="/" aria-label="Bros Store — início" className="text-[1.35rem] font-extrabold tracking-[.08em] sm:text-[1.45rem]">{settings?.logoUrl ? <Image src={settings.logoUrl} alt={settings.storeName || 'Bros Store'} width={220} height={52} sizes="220px" className="h-10 w-auto object-contain" /> : <>BROS<span className="ml-1 text-brand">STORE</span></>}</a>
      <nav aria-label="Navegação principal" className="hidden items-center gap-8 lg:flex">{desktopLinks.map(([name, href]) => <a key={href} href={href} className="text-[11px] font-bold uppercase tracking-[.12em] text-zinc-300 transition hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">{name}</a>)}</nav>
      <div className="flex items-center gap-3"><a className="hidden items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-brand transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand sm:flex" href="/produtos">Comprar agora <ArrowUpRight size={14} /></a><CustomerAuthLinks /><a aria-label="Ver produtos" className="grid h-10 w-10 place-items-center rounded-lg border border-white/15 transition hover:border-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" href="/produtos"><ShoppingBag size={17} /></a><button type="button" aria-label="Abrir carrinho" onClick={openCart} className="relative grid h-10 w-10 place-items-center rounded-lg border border-white/15 transition hover:border-brand hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"><ShoppingCart size={17} />{hydrated && totalQuantity > 0 && <span aria-label={`${totalQuantity} itens no carrinho`} className="absolute -right-2 -top-2 grid min-h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[10px] font-extrabold text-ink">{totalQuantity > 99 ? '99+' : totalQuantity}</span>}</button><button type="button" aria-label={open ? 'Fechar menu' : 'Abrir menu'} aria-expanded={open} aria-controls="menu-mobile" onClick={() => setOpen((value) => !value)} className="relative z-[60] grid h-10 w-10 place-items-center rounded-lg border border-white/15 transition hover:border-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand lg:hidden">{open ? <X size={20} /> : <Menu size={20} />}</button></div>
    </div>
    <AnimatePresence>{open && <motion.div id="menu-mobile" role="dialog" aria-modal="true" aria-label="Menu de navegação" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-ink px-7 pb-8 pt-28 shadow-[-30px_0_80px_rgba(0,0,0,.5)] sm:px-10"><p className="eyebrow">Navegue pela Bros</p><nav aria-label="Navegação móvel" className="flex flex-1 flex-col justify-center gap-1">{mobileLinks.map(([name, href], index) => <motion.a initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.13 + index * 0.055 }} onClick={() => setOpen(false)} href={href} key={name} className="border-b border-white/10 py-4 text-3xl font-extrabold tracking-tight transition hover:pl-2 hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">{name}</motion.a>)}</nav><div onClick={() => setOpen(false)}><CustomerAuthLinks mobile /></div><div className="flex items-center justify-between border-t border-white/10 pt-6 text-xs text-zinc-500"><span>{settings?.slogan || 'Vista sua atitude.'}</span><span className="text-brand">{settings?.storeName || 'Bros Store'}</span></div></motion.div>}</AnimatePresence>
  </header>;
}
