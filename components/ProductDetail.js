'use client';

import Image from 'next/image';
import { Minus, PackageCheck, Plus, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { storeWhatsappLink } from '../lib/storeSettings';
import ProductCard from './ProductCard';
import { useCart } from './cart/CartContext';

function ProductImageFallback({ label }) {
  return <div className="grid h-full w-full place-items-center bg-zinc-900 px-8 text-center text-sm font-semibold text-zinc-500">Imagem de {label} indisponível.</div>;
}

export default function ProductDetail({ product, related = [], settings }) {
  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  const sizes = Array.isArray(product.sizes) ? product.sizes : [];
  const colors = Array.isArray(product.colors) ? product.colors : [];
  const [image, setImage] = useState(0);
  const [size, setSize] = useState('');
  const [color, setColor] = useState(colors.length === 1 ? 0 : null);
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState('');
  const [buying, setBuying] = useState(false);
  const router = useRouter();
  const { addItem, closeCart } = useCart();

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(''), 3200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const selectedColor = color === null ? '' : colors[color] || '';
  const selectedVariant = (product.inventoryVariants || []).find((variant) => variant.size === size && variant.color === selectedColor);
  const availableQuantity = selectedVariant ? selectedVariant.quantity : product.stock;
  const hasKnownStock = availableQuantity !== null && availableQuantity !== undefined;
  const maxReached = hasKnownStock && availableQuantity <= quantity;
  const whatsapp = storeWhatsappLink(settings, [
    `Olá! Quero comprar: ${product.name}.`,
    size && `Tamanho: ${size}.`,
    selectedColor && `Cor: ${selectedColor}.`,
    `Quantidade: ${quantity}.`,
    `Preço: ${product.price}.`,
  ].filter(Boolean).join(' '));

  function validateSelection() {
    if (product.isAvailable === false) { setNotice('Este produto está indisponível.'); return false; }
    if (sizes.length && !size) { setNotice('Selecione um tamanho.'); return false; }
    if (colors.length && color === null) { setNotice('Selecione uma cor.'); return false; }
    if ((product.inventoryVariants || []).length && (!selectedVariant || selectedVariant.quantity < quantity)) { setNotice(selectedVariant ? 'Quantidade indisponível em estoque.' : 'Esta combinação está esgotada.'); return false; }
    if (hasKnownStock && availableQuantity < quantity) { setNotice('Quantidade indisponível em estoque.'); return false; }
    return true;
  }
  function addToCart() { if (!validateSelection()) return; addItem(product, { selectedSize: size, selectedColor, quantity }); setNotice('Produto adicionado ao carrinho.'); }
  function buyNow() { if (buying || !validateSelection()) return; setBuying(true); addItem(product, { selectedSize: size, selectedColor, quantity }); closeCart(); router.push('/checkout'); }

  return <main className="bg-ink pt-[78px]">
    <section className="section pt-10">
      <nav aria-label="Caminho de navegação" className="mb-7 text-xs text-zinc-500"><a href="/" className="hover:text-brand">Início</a><span className="px-2">/</span><a href="/produtos" className="hover:text-brand">Produtos</a><span className="px-2">/</span>{product.name}</nav>
      <div className="grid gap-10 xl:grid-cols-[1.08fr_.92fr] xl:gap-20">
        <div className="animate-[rise_.55s_ease-out_both]"><div className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-zinc-900">{images[image] ? <Image src={images[image]} alt={product.name} fill priority sizes="(max-width: 1280px) 100vw, 55vw" className="object-contain transition duration-700 motion-safe:group-hover:scale-105" /> : <ProductImageFallback label={product.name} />}{product.badge && <span className="absolute left-5 top-5 rounded-md bg-brand px-3 py-1.5 text-[10px] font-extrabold tracking-wider text-ink">{product.badge}</span>}</div>{images.length > 1 && <div className="mt-4 flex gap-3 overflow-x-auto pb-1" aria-label="Galeria do produto">{images.map((src, index) => <button type="button" key={src} onClick={() => setImage(index)} aria-label={`Ver imagem ${index + 1}`} aria-pressed={image === index} className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:h-24 sm:w-24 ${image === index ? 'border-brand' : 'border-transparent opacity-60 hover:opacity-100'}`}><Image src={src} alt={`${product.name} - imagem ${index + 1}`} fill sizes="96px" className="object-contain" /></button>)}</div>}</div>
        <div className="animate-[rise_.55s_.1s_ease-out_both] xl:pt-4">{product.category && <p className="text-[11px] font-bold uppercase tracking-[.16em] text-zinc-500">{product.category}</p>}<h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">{product.name}</h1><div className="mt-7 flex flex-wrap items-end gap-3"><span className="text-3xl font-extrabold text-brand">{product.price}</span>{product.oldPrice && <span className="pb-1 text-sm text-zinc-500 line-through">{product.oldPrice}</span>}</div>{product.description && <p className="mt-7 max-w-lg leading-7 text-zinc-400">{product.description}</p>}
          {sizes.length > 0 && <fieldset className="mt-8"><legend className="text-sm font-bold">Tamanho{size && <>: <span className="text-brand">{size}</span></>}</legend><div className="mt-3 flex flex-wrap gap-2">{sizes.map((value) => <button type="button" onClick={() => setSize(value)} key={value} aria-pressed={size === value} className={`grid h-11 min-w-11 place-items-center rounded-lg border text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${size === value ? 'border-brand bg-brand text-ink' : 'border-white/15 hover:border-brand'}`}>{value}</button>)}</div></fieldset>}
          {colors.length > 1 && <fieldset className="mt-6"><legend className="text-sm font-bold">Cor</legend><div className="mt-3 flex flex-wrap gap-3">{colors.map((value, index) => <button type="button" key={value} onClick={() => setColor(index)} aria-label={`Selecionar cor ${value}`} aria-pressed={color === index} className={`grid h-9 w-9 place-items-center rounded-full border-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${color === index ? 'border-brand' : 'border-transparent'}`}><span className="h-6 w-6 rounded-full border border-white/20" style={{ backgroundColor: value }} /></button>)}</div></fieldset>}
          <div className="mt-6 flex items-center gap-4"><p className="text-sm font-bold">Quantidade</p><div className="flex items-center rounded-lg border border-white/15"><button type="button" aria-label="Diminuir quantidade" disabled={quantity <= 1} onClick={() => setQuantity((current) => Math.max(1, current - 1))} className="grid h-10 w-10 place-items-center hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"><Minus size={15} /></button><output aria-live="polite" className="w-8 text-center text-sm font-bold">{quantity}</output><button type="button" aria-label="Aumentar quantidade" disabled={maxReached || product.isAvailable === false} onClick={() => setQuantity((current) => current + 1)} className="grid h-10 w-10 place-items-center hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"><Plus size={15} /></button></div></div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2"><button type="button" disabled={buying || product.isAvailable === false} onClick={buyNow} className="button-primary disabled:cursor-not-allowed disabled:opacity-60"><ShoppingBag size={16} />{buying ? 'Redirecionando...' : 'Comprar agora'}</button><button type="button" disabled={product.isAvailable === false} onClick={addToCart} className="button-dark disabled:cursor-not-allowed disabled:opacity-60"><Plus size={16} />Adicionar ao carrinho</button></div><a target="_blank" rel="noopener noreferrer" href={whatsapp} className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-[#25D366]/70 py-4 text-xs font-extrabold uppercase tracking-[.12em] text-[#25D366] transition hover:bg-[#25D366] hover:text-white">Comprar pelo WhatsApp</a><div className="mt-10 grid gap-4 border-t border-white/10 pt-7 sm:grid-cols-2">{[[Truck, 'Entrega combinada'], [ShieldCheck, 'Pagamento via PIX'], [PackageCheck, 'Compra segura'], [ShoppingBag, 'Atendimento pelo WhatsApp']].map(([Icon, label]) => <div className="flex items-center gap-3 text-sm text-zinc-300" key={label}><Icon size={18} className="text-brand" />{label}</div>)}</div>
        </div>
      </div>
      {product.description && <section className="mt-24 border-t border-white/10 pt-10"><h2 className="text-xl font-extrabold">DESCRIÇÃO <span className="text-brand">COMPLETA.</span></h2><p className="mt-6 max-w-3xl leading-7 text-zinc-400">{product.description}</p></section>}
      {related.length > 0 && <section className="mt-12"><p className="eyebrow">Continue explorando</p><h2 className="section-title">PRODUTOS <span className="text-brand">RELACIONADOS.</span></h2><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{related.map((item) => <ProductCard compact product={item} key={item.id} />)}</div></section>}
    </section>
    {notice && <div role="status" aria-live="polite" className={`fixed bottom-6 left-1/2 z-[90] w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2 rounded-xl border px-5 py-4 text-center text-sm font-bold shadow-2xl ${notice.includes('adicionado') ? 'border-brand bg-brand text-ink' : 'border-red-400/60 bg-red-950 text-white'}`}>{notice}</div>}
  </main>;
}
