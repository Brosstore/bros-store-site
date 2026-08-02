'use client';

import { MapPin, Package, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';

const links = [
  ['minha-conta', 'Minha conta', UserRound],
  ['pedidos', 'Pedidos', Package],
  ['enderecos', 'Endereços', MapPin],
];

export default function AccountNavigation() {
  const [active, setActive] = useState('minha-conta');

  useEffect(() => {
    const sync = () => setActive(window.location.hash.slice(1) || 'minha-conta');
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  return <nav aria-label="Navegação da conta" className="section pb-0 pt-6">
    <div className="flex gap-2 overflow-x-auto rounded-xl border border-white/10 bg-white/[.025] p-2 [scrollbar-width:thin]">
      {links.map(([id, label, Icon]) => <a key={id} href={`#${id}`} aria-current={active === id ? 'location' : undefined} className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-extrabold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${active === id ? 'bg-brand text-ink' : 'text-zinc-300 hover:bg-white/10 hover:text-brand'}`}><Icon aria-hidden="true" size={14} />{label}</a>)}
    </div>
  </nav>;
}
