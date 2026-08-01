'use client';

import { LoaderCircle, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '../../../lib/supabase/client';

const categories = [{ slug: 'tenis', name: 'Calçados' }, { slug: 'acessorios', name: 'Acessórios' }, { slug: 'masculino', name: 'Masculino' }, { slug: 'feminino', name: 'Feminino' }];
const badges = ['', 'NOVO', 'PROMOÇÃO', 'MAIS VENDIDO'];
const slugify = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const toCents = (value) => Math.round(Number(String(value).replace(',', '.')) * 100);
const toList = (value) => value.split(',').map((item) => item.trim()).filter(Boolean);

function Input({ label, ...props }) {
  return <label className="block text-sm font-semibold text-zinc-200">{label}<input {...props} className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-brand" /></label>;
}

function Toggle({ checked, label, onChange }) {
  return <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="accent-[#f5c518]" />{label}</label>;
}

export default function ProductForm({ product }) {
  const router = useRouter();
  const editing = Boolean(product?.id);
  const [name, setName] = useState(product?.name || '');
  const [slug, setSlug] = useState(product?.slug || '');
  const [manualSlug, setManualSlug] = useState(editing);
  const [categorySlug, setCategorySlug] = useState(product?.category_slug || '');
  const [brand, setBrand] = useState(product?.brand || '');
  const [description, setDescription] = useState(product?.description || '');
  const [price, setPrice] = useState(product?.price_cents ? String(product.price_cents / 100) : '');
  const [oldPrice, setOldPrice] = useState(product?.old_price_cents ? String(product.old_price_cents / 100) : '');
  const [stock, setStock] = useState(product?.stock ?? '');
  const [badge, setBadge] = useState(product?.badge || '');
  const [displayOrder, setDisplayOrder] = useState(String(product?.display_order ?? 0));
  const [featured, setFeatured] = useState(product?.featured || false);
  const [featuredHome, setFeaturedHome] = useState(product?.featured_home || false);
  const [newArrival, setNewArrival] = useState(product?.new_arrival || false);
  const [promotionHome, setPromotionHome] = useState(product?.promotion_home || false);
  const [heroFeature, setHeroFeature] = useState(product?.hero_feature || false);
  const [active, setActive] = useState(product?.active ?? true);
  const [sizes, setSizes] = useState((product?.sizes || []).join(', '));
  const [colors, setColors] = useState((product?.colors || []).join(', '));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    const category = categories.find((item) => item.slug === categorySlug);
    const priceCents = toCents(price);
    const oldPriceCents = oldPrice ? toCents(oldPrice) : null;
    const order = Number(displayOrder);

    if (!name.trim() || !slugify(slug) || !category || !description.trim() || !Number.isFinite(priceCents) || priceCents < 0) return setError('Preencha nome, slug, categoria, descrição e um preço válido.');
    if (oldPrice && (!Number.isFinite(oldPriceCents) || oldPriceCents < priceCents)) return setError('O preço antigo deve ser igual ou maior que o preço atual.');
    if (stock !== '' && (!Number.isInteger(Number(stock)) || Number(stock) < 0)) return setError('O estoque deve ser um número inteiro igual ou maior que zero.');
    if (!Number.isInteger(order)) return setError('A ordem de exibição deve ser um número inteiro.');

    const payload = {
      name: name.trim(),
      slug: slugify(slug),
      category_slug: category.slug,
      category_name: category.name,
      brand: brand.trim() || null,
      description: description.trim(),
      price_cents: priceCents,
      old_price_cents: oldPriceCents,
      stock: stock === '' ? null : Number(stock),
      badge: badge || null,
      display_order: order,
      featured,
      featured_home: featuredHome,
      new_arrival: newArrival,
      promotion_home: promotionHome,
      hero_feature: heroFeature,
      active,
      sizes: toList(sizes),
      colors: toList(colors),
    };

    setSaving(true);
    try {
      const supabase = createClient();
      const { error: saveError } = editing
        ? await supabase.from('products').update(payload).eq('id', product.id)
        : await supabase.from('products').insert(payload);
      if (saveError) return setError(saveError.code === '23505' ? 'Este slug já está em uso. Escolha outro.' : 'Não foi possível salvar o produto. Tente novamente.');
      router.replace(`/admin/produtos?sucesso=${editing ? 'atualizado' : 'criado'}`);
      router.refresh();
    } catch {
      setError('Não foi possível conectar ao Supabase. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  return <form onSubmit={submit} className="mt-8 space-y-6">
    <div className="grid gap-5 md:grid-cols-2"><Input label="Nome" required value={name} onChange={(event) => { setName(event.target.value); if (!manualSlug) setSlug(slugify(event.target.value)); }} /><Input label="Slug" required value={slug} onChange={(event) => { setManualSlug(true); setSlug(event.target.value); }} /></div>
    <div className="grid gap-5 md:grid-cols-2"><label className="block text-sm font-semibold text-zinc-200">Categoria<select required value={categorySlug} onChange={(event) => setCategorySlug(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-white outline-none focus:border-brand"><option value="">Selecione</option>{categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select></label><Input label="Marca" value={brand} onChange={(event) => setBrand(event.target.value)} /></div>
    <label className="block text-sm font-semibold text-zinc-200">Descrição<textarea required value={description} onChange={(event) => setDescription(event.target.value)} rows={5} className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-white outline-none focus:border-brand" /></label>
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"><Input label="Preço" required inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} /><Input label="Preço antigo" inputMode="decimal" value={oldPrice} onChange={(event) => setOldPrice(event.target.value)} /><Input label="Estoque" inputMode="numeric" value={stock} onChange={(event) => setStock(event.target.value)} /><label className="block text-sm font-semibold text-zinc-200">Badge<select value={badge} onChange={(event) => setBadge(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-white outline-none focus:border-brand">{badges.map((item) => <option key={item || 'none'} value={item}>{item || 'Sem badge'}</option>)}</select></label></div>
    <div className="grid gap-5 md:grid-cols-2"><Input label="Tamanhos (separados por vírgula)" value={sizes} onChange={(event) => setSizes(event.target.value)} /><Input label="Cores (separadas por vírgula)" value={colors} onChange={(event) => setColors(event.target.value)} /></div>
    <fieldset className="grid gap-4 rounded-xl border border-white/10 bg-white/[.025] p-5 sm:grid-cols-2"><legend className="px-2 text-sm font-extrabold text-brand">Vitrines da Home</legend><Input label="Ordem de exibição" inputMode="numeric" value={displayOrder} onChange={(event) => setDisplayOrder(event.target.value)} /><p className="self-end text-xs leading-5 text-zinc-500">Números menores aparecem primeiro dentro de cada vitrine.</p><div className="grid gap-4 sm:col-span-2 sm:grid-cols-2"><Toggle checked={featuredHome} onChange={setFeaturedHome} label="Destaque na Home" /><Toggle checked={newArrival} onChange={setNewArrival} label="Lançamento" /><Toggle checked={promotionHome} onChange={setPromotionHome} label="Promoção" /><Toggle checked={heroFeature} onChange={setHeroFeature} label="Hero" /></div></fieldset>
    <div className="flex flex-wrap gap-6 rounded-xl border border-white/10 bg-white/[.025] p-5"><Toggle checked={featured} onChange={setFeatured} label="Destaque do catálogo" /><Toggle checked={active} onChange={setActive} label="Ativo" /></div>
    {error && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}
    <div className="flex justify-end gap-3"><a href="/admin/produtos" className="button-dark px-5 py-3">Cancelar</a><button disabled={saving} className="button-primary px-5 py-3 disabled:opacity-70">{saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}{saving ? 'Salvando...' : 'Salvar produto'}</button></div>
  </form>;
}
