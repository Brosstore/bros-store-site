'use client';
import { ArrowUpRight, Camera, MapPin, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { siteConfig, whatsappLink } from '../lib/siteConfig';

export default function Footer() {
  const [email, setEmail] = useState('');

  function handleNewsletter(event) {
    event.preventDefault();
    if (!email) return;
    const message = `Olá! Quero receber novidades da Bros Store. Meu e-mail: ${email}`;
    window.open(whatsappLink(message), '_blank', 'noopener,noreferrer');
    setEmail('');
  }

  return <footer className="border-t border-white/10 bg-ink">
    <div className="section grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
      <div><a href="/" className="text-2xl font-extrabold tracking-[.08em]">BROS<span className="ml-1 text-brand">STORE</span></a><p className="mt-5 max-w-[12rem] text-base font-bold text-white">{siteConfig.tagline}</p><p className="mt-2 text-sm text-zinc-500">Moda • Streetwear • Acessórios</p></div>
      <div><h3 className="font-mono text-[10px] font-bold uppercase tracking-[.2em] text-brand">Categorias</h3><div className="mt-5 grid gap-3 text-sm text-zinc-400"><a className="transition hover:text-brand" href="/produtos?categoria=tenis">Tênis</a><a className="transition hover:text-brand" href="/produtos?categoria=acessorios">Acessórios</a></div></div>
      <div><h3 className="font-mono text-[10px] font-bold uppercase tracking-[.2em] text-brand">Atendimento</h3><div className="mt-5 grid gap-3 text-sm text-zinc-400"><a className="transition hover:text-brand" href="/#contato">Fale conosco</a><a className="transition hover:text-brand" href="/#contato">Dúvidas frequentes</a><a className="transition hover:text-brand" href="/#contato">Localização</a><a className="transition hover:text-brand" href="/#contato">Trocas e devoluções</a></div></div>
      <div><h3 className="font-mono text-[10px] font-bold uppercase tracking-[.2em] text-brand">Redes sociais</h3><div className="mt-5 grid gap-3 text-sm text-zinc-400"><a className="flex items-center gap-2 transition hover:text-brand" href={whatsappLink()} target="_blank" rel="noreferrer"><MessageCircle size={16}/> WhatsApp</a><a className="flex items-center gap-2 transition hover:text-brand" href={siteConfig.instagramUrl} target="_blank" rel="noreferrer"><Camera size={16}/> Instagram</a><span className="flex items-center gap-2"><MapPin size={16}/> {siteConfig.address.city}</span></div><form className="mt-7" onSubmit={handleNewsletter}><label htmlFor="newsletter" className="text-[10px] font-bold uppercase tracking-[.14em] text-zinc-400">Receba novidades</label><div className="mt-3 flex border-b border-white/20 focus-within:border-brand"><input id="newsletter" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Seu e-mail" placeholder="Seu e-mail" className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-zinc-600"/><button type="submit" aria-label="Assinar novidades" className="grid h-9 w-9 place-items-center text-brand transition hover:scale-110"><ArrowUpRight size={16}/></button></div></form></div>
    </div>
    <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-3 border-t border-white/10 px-5 py-6 text-xs text-zinc-600 sm:px-8 lg:px-12"><span>© {new Date().getFullYear()} {siteConfig.name}.</span><span>Todos os direitos reservados.</span></div>
  </footer>;
}
