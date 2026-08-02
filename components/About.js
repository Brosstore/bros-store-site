import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import MotionReveal from './MotionReveal';

export default function About() {
  return <section id="sobre" className="section grid items-center gap-14 lg:grid-cols-2 lg:gap-24">
    <MotionReveal variant="left" className="relative"><div className="absolute -inset-3 rounded-2xl border border-brand/60" /><div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl"><Image src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1100&q=85" alt="Pessoas com estilo urbano" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover grayscale transition duration-700 hover:grayscale-0" /></div></MotionReveal>
    <MotionReveal variant="right"><p className="eyebrow">A essência Bros</p><h2 className="section-title">VISTA SUA<br /><span className="text-brand">ATITUDE.</span></h2><p className="mt-7 max-w-lg text-lg font-medium leading-8 text-zinc-300">A Bros Store acredita que cada escolha é uma forma de mostrar quem você é. Não é só sobre vestir — é sobre ocupar seu espaço.</p><p className="mt-4 max-w-lg leading-7 text-zinc-500">Selecionamos roupas, calçados e acessórios que unem qualidade, conforto e atitude para quem vive o estilo streetwear com autenticidade.</p><a href="/#contato" className="button-dark mt-9">Fale com a Bros <ArrowUpRight size={16} /></a></MotionReveal>
  </section>;
}
