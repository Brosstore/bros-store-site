'use client';

import Image from 'next/image';
import { Heart, Minus, PackageCheck, Plus, ShieldCheck, ShoppingBag, Truck, Undo2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { storeWhatsappLink } from '../lib/storeSettings';
import ProductCard from './ProductCard';
import { useCart } from './cart/CartContext';

const tabs = ['Descrição completa', 'Tabela de medidas'];

export default function ProductDetail({ product, related, settings }) {
  const sizes = product.sizes || [];
  const colors = product.colors || [];
  const [image, setImage] = useState(0);
  const [size, setSize] = useState('');
  const [color, setColor] = useState(colors.length === 1 ? 0 : null);
  const [quantity, setQuantity] = useState(1);
  const [tab, setTab] = useState(0);
  const [favorite, setFavorite] = useState(false);
  const [notice, setNotice] = useState('');
  const router = useRouter();
  const { addItem, closeCart } = useCart();
  const [buying, setBuying] = useState(false);

  useEffect(() => { if (!notice) return undefined; const timeout = window.setTimeout(() => setNotice(''), 3200); return () => window.clearTimeout(timeout); }, [notice]);
  const selectedColor = color === null ? '' : colors[color] || '';
  const selectedVariant = (product.inventoryVariants || []).find((variant) => variant.size === size && variant.color === selectedColor);
  const availableQuantity = selectedVariant ? selectedVariant.quantity : product.stock;
  const unavailable = product.isAvailable === false || (selectedVariant && selectedVariant.quantity < quantity);
  const whatsapp = storeWhatsappLink(settings, [`Olá! Quero comprar: ${product.name}.`, size && `Tamanho: ${size}.`, selectedColor && `Cor: ${selectedColor}.`, `Quantidade: ${quantity}.`, `Preço: ${product.price}.`].filter(Boolean).join(' '));
  const valid = () => {
    if (product.isAvailable === false) { setNotice('Este produto está indisponível.'); return false; }
    if (sizes.length && !size) { setNotice('Selecione um tamanho.'); return false; }
    if (colors.length && color === null) { setNotice('Selecione uma cor.'); return false; }
    if ((product.inventoryVariants || []).length && (!selectedVariant || selectedVariant.quantity < quantity)) { setNotice('Quantidade indisponível em estoque.'); return false; }
    if (availableQuantity !== null && availableQuantity !== undefined && availableQuantity < quantity) { setNotice('Quantidade indisponível em estoque.'); return false; }
    return true;
  };
  const addToCart = () => {
    if (!valid()) return;
    addItem(product, { selectedSize: size, selectedColor, quantity });
    setNotice('Produto adicionado ao carrinho.');
  };
  const buyNow = () => { if (buying || !valid()) return; setBuying(true); addItem(product, { selectedSize: size, selectedColor, quantity }); closeCart(); router.push('/checkout'); };
  useEffect(() => {
    const intercept = (event) => {
      const link = event.target.closest('a');
      if (link?.textContent?.includes('Comprar agora')) { event.preventDefault(); buyNow(); }
    };
    document.addEventListener('click', intercept);
    return () => document.removeEventListener('click', intercept);
  });
  const content = [
    <p key="description">{product.description} Desenvolvida com materiais selecionados, acabamento durável e atenção aos detalhes que fazem a diferença no seu visual.</p>,
    sizes.length ? <div key="measurements" className="grid max-w-md grid-cols-3 gap-3 text-sm"><span className="font-bold">Tamanho</span><span className="font-bold">Tórax</span><span className="font-bold">Comprimento</span>{sizes.map((value, index) => <div className="contents" key={value}><span>{value}</span><span>{88 + index * 4} cm</span><span>{65 + index * 2} cm</span></div>)}</div> : <p key="measurements">Este produto não possui tabela de medidas.</p>,
  ];

  return <main className="bg-ink pt-[78px]"><section className="section pt-10"><div className="mb-7 text-xs text-zinc-500"><a href="/" className="hover:text-brand">Início</a> <span className="px-2">/</span> <a href="/produtos" className="hover:text-brand">Produtos</a> <span className="px-2">/</span> {product.name}</div><div className="grid gap-10 xl:grid-cols-[1.08fr_.92fr] xl:gap-20"><div className="animate-[rise_.55s_ease-out_both]"><div className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-zinc-900"><Image src={product.images[image]} alt={product.name} fill priority sizes="(max-width: 1280px) 100vw, 55vw" className="object-contain transition duration-700 group-hover:scale-105"/>{product.badge && <span className="absolute left-5 top-5 rounded-md bg-brand px-3 py-1.5 text-[10px] font-extrabold tracking-wider text-ink">{product.badge}</span>}</div><div className="mt-4 grid grid-cols-3 gap-3">{product.images.map((src, index) => <button type="button" key={src} onClick={() => setImage(index)} aria-label={`Ver imagem ${index + 1}`} className={`relative aspect-square overflow-hidden rounded-xl border-2 transition ${image === index ? 'border-brand' : 'border-transparent opacity-60 hover:opacity-100'}`}><Image src={src} alt={`${product.name} - imagem ${index + 1}`} fill sizes="(max-width: 640px) 33vw, 160px" className="object-contain"/></button>)}</div></div><div className="animate-[rise_.55s_.1s_ease-out_both] xl:pt-4"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-zinc-500">{product.category}</p><div className="mt-3 flex items-start justify-between gap-5"><h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">{product.name}</h1><button type="button" onClick={() => setFavorite(!favorite)} aria-label="Favoritar produto" className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border transition ${favorite ? 'border-brand bg-brand text-ink' : 'border-white/15 hover:border-brand hover:text-brand'}`}><Heart size={18} fill={favorite ? 'currentColor' : 'none'}/></button></div><div className="mt-7 flex items-end gap-3"><span className="text-3xl font-extrabold text-brand">{product.price}</span>{product.oldPrice && <span className="pb-1 text-sm text-zinc-500 line-through">{product.oldPrice}</span>}</div><p className="mt-1 text-sm text-zinc-500">Em até 12x sem juros</p><p className="mt-7 max-w-lg leading-7 text-zinc-400">{product.description}</p>{sizes.length > 0 && <div className="mt-8"><p className="text-sm font-bold">Tamanho{size && <>: <span className="text-brand">{size}</span></>}</p><div className="mt-3 flex flex-wrap gap-2">{sizes.map((value) => <button type="button" onClick={() => setSize(value)} key={value} className={`grid h-11 min-w-11 place-items-center rounded-lg border text-sm font-bold transition ${size === value ? 'border-brand bg-brand text-ink' : 'border-white/15 hover:border-brand'}`}>{value}</button>)}</div></div>}{colors.length > 1 && <div className="mt-6"><p className="text-sm font-bold">Cor</p><div className="mt-3 flex gap-3">{colors.map((value, index) => <button type="button" key={value} onClick={() => setColor(index)} aria-label={`Selecionar cor ${index + 1}`} className={`grid h-9 w-9 place-items-center rounded-full border-2 ${color === index ? 'border-brand' : 'border-transparent'}`}><span className="h-6 w-6 rounded-full border border-white/20" style={{ backgroundColor: value }}/></button>)}</div></div>}<div className="mt-6 flex items-center gap-4"><p className="text-sm font-bold">Quantidade</p><div className="flex items-center rounded-lg border border-white/15"><button type="button" aria-label="Diminuir quantidade" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="grid h-10 w-10 place-items-center hover:text-brand"><Minus size={15}/></button><span className="w-8 text-center text-sm font-bold">{quantity}</span><button type="button" aria-label="Aumentar quantidade" onClick={() => setQuantity(quantity + 1)} className="grid h-10 w-10 place-items-center hover:text-brand"><Plus size={15}/></button></div></div><div className="mt-8 grid gap-3 sm:grid-cols-2"><a href={whatsapp} target="_blank" rel="noreferrer" className="button-primary"><ShoppingBag size={16}/> Comprar agora</a><button type="button" onClick={addToCart} className="button-dark"><Plus size={16}/> Adicionar ao carrinho</button></div><a target="_blank" rel="noreferrer" href={whatsapp} className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-[#25D366]/70 py-4 text-xs font-extrabold uppercase tracking-[.12em] text-[#25D366] transition hover:bg-[#25D366] hover:text-white">Comprar pelo WhatsApp</a><div className="mt-10 grid gap-4 border-t border-white/10 pt-7 sm:grid-cols-2">{[[Truck,'Entrega para todo o Brasil'],[Undo2,'Troca grátis em até 7 dias'],[ShieldCheck,'Pagamento 100% seguro'],[PackageCheck,'Garantia de qualidade']].map(([Icon,label]) => <div className="flex items-center gap-3 text-sm text-zinc-300" key={label}><Icon size={18} className="text-brand"/>{label}</div>)}</div></div></div><section className="mt-24 border-t border-white/10 pt-10"><div className="flex gap-6 overflow-x-auto border-b border-white/10">{tabs.map((label, index) => <button type="button" key={label} onClick={() => setTab(index)} className={`whitespace-nowrap border-b-2 pb-4 text-sm font-bold transition ${tab === index ? 'border-brand text-brand' : 'border-transparent text-zinc-500 hover:text-white'}`}>{label}</button>)}</div><div className="max-w-3xl animate-[rise_.3s_ease-out_both] py-8 leading-7 text-zinc-400" key={tab}>{content[tab]}</div></section><section className="mt-12"><p className="eyebrow">Continue explorando</p><h2 className="section-title">PRODUTOS <span className="text-brand">RELACIONADOS.</span></h2><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{related.map((item) => <ProductCard compact product={item} key={item.id}/>)}</div></section></section>{notice && <div role="status" className={`fixed bottom-6 left-1/2 z-[90] w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2 rounded-xl border px-5 py-4 text-center text-sm font-bold shadow-2xl ${notice.includes('adicionado') ? 'border-brand bg-brand text-ink' : 'border-red-400/60 bg-red-950 text-white'}`}>{notice}</div>}</main>;
}
