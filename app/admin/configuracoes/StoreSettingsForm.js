'use client';

/* eslint-disable @next/next/no-img-element */
import { ImageIcon, LoaderCircle, Save, Upload, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { saveStoreSettings } from './actions';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxSize = 5 * 1024 * 1024;

function Field({ label, name, defaultValue, type = 'text', required = false, placeholder }) {
  return <label className="grid gap-2 text-sm font-semibold text-zinc-200"><span>{label}</span><input name={name} type={type} defaultValue={defaultValue || ''} required={required} placeholder={placeholder} className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-sm font-medium text-white outline-none transition placeholder:text-zinc-600 focus:border-brand" /></label>;
}

function AssetField({ label, name, currentUrl, preview, onChange, onClear }) {
  return <div className="rounded-xl border border-white/10 bg-white/[.025] p-4"><p className="text-sm font-bold text-white">{label}</p><p className="mt-1 text-xs leading-5 text-zinc-500">JPG, PNG ou WEBP · até 5 MB</p><div className="mt-4 flex flex-wrap items-center gap-4">{preview || currentUrl ? <img src={preview || currentUrl} alt={`Prévia de ${label.toLowerCase()}`} className="h-20 w-28 rounded-lg border border-white/10 bg-black/30 object-contain" /> : <div className="grid h-20 w-28 place-items-center rounded-lg border border-dashed border-white/15 text-zinc-500"><ImageIcon size={20} /></div>}<div className="flex flex-wrap gap-2"><label className="button-dark cursor-pointer px-4 py-3 text-xs"><Upload size={15} />Escolher arquivo<input name={name} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onChange} /></label>{preview && <button type="button" onClick={onClear} className="rounded-xl border border-white/15 px-3 py-3 text-zinc-300 transition hover:border-red-400 hover:text-red-200" aria-label={`Remover nova prévia de ${label}`}><X size={16} /></button>}</div></div></div>;
}

export default function StoreSettingsForm({ settings }) {
  const router = useRouter();
  const formRef = useRef(null);
  const previewUrls = useRef(new Set());
  const [logoPreview, setLogoPreview] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  useEffect(() => () => previewUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  function updatePreview(setPreview) { return (event) => { const file = event.target.files?.[0]; if (!file) return; if (!allowedTypes.has(file.type) || file.size > maxSize) { event.target.value = ''; setResult({ error: 'Use JPG, PNG ou WEBP de até 5 MB.' }); return; } setPreview((previous) => { if (previous) { URL.revokeObjectURL(previous); previewUrls.current.delete(previous); } const url = URL.createObjectURL(file); previewUrls.current.add(url); return url; }); }; }
  function clearPreview(name, setPreview) { return () => { const input = formRef.current?.elements.namedItem(name); if (input) input.value = ''; setPreview((previous) => { if (previous) { URL.revokeObjectURL(previous); previewUrls.current.delete(previous); } return null; }); }; }
  async function submit(event) { event.preventDefault(); setSaving(true); setResult(null); try { const response = await saveStoreSettings(new FormData(event.currentTarget)); if (response.error) setResult({ error: response.error }); else { setResult({ success: true, warning: response.warnings?.[0] }); router.refresh(); } } catch (error) { setResult({ error: error.message || 'Não foi possível salvar as configurações.' }); } finally { setSaving(false); } }

  return <form ref={formRef} onSubmit={submit} className="mt-8 grid gap-7">
    <fieldset className="grid gap-4 rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:grid-cols-2"><legend className="px-2 text-sm font-extrabold text-brand">Identidade</legend><Field label="Nome da loja" name="storeName" defaultValue={settings.storeName} required /><Field label="Slogan" name="slogan" defaultValue={settings.slogan} required /><label className="grid gap-2 text-sm font-semibold text-zinc-200 sm:col-span-2"><span>Descrição</span><textarea name="description" defaultValue={settings.description} required rows="4" className="resize-y rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-sm font-medium text-white outline-none transition focus:border-brand" /></label></fieldset>
    <fieldset className="grid gap-4 rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:grid-cols-2"><legend className="px-2 text-sm font-extrabold text-brand">Contato e redes sociais</legend><Field label="WhatsApp" name="whatsapp" defaultValue={settings.whatsapp} required placeholder="5511999999999" /><Field label="E-mail" name="email" type="email" defaultValue={settings.email} required /><Field label="Instagram" name="instagram" defaultValue={settings.instagram} placeholder="https://instagram.com/sua_loja" /><Field label="Facebook" name="facebook" defaultValue={settings.facebook} placeholder="https://facebook.com/sua_loja" /><Field label="TikTok" name="tiktok" defaultValue={settings.tiktok} placeholder="https://tiktok.com/@sua_loja" /></fieldset>
    <fieldset className="grid gap-4 rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:grid-cols-2"><legend className="px-2 text-sm font-extrabold text-brand">Endereço e atendimento</legend><label className="grid gap-2 text-sm font-semibold text-zinc-200 sm:col-span-2"><span>Endereço</span><input name="address" defaultValue={settings.address} className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-sm font-medium text-white outline-none transition focus:border-brand" /></label><Field label="Cidade" name="city" defaultValue={settings.city} /><Field label="Estado" name="state" defaultValue={settings.state} /><Field label="Horário de funcionamento" name="openingHours" defaultValue={settings.openingHours} placeholder="Seg a sáb, 9h às 18h" /></fieldset>
    <fieldset className="grid gap-4 rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:grid-cols-2"><legend className="px-2 text-sm font-extrabold text-brand">Imagens da loja</legend><AssetField label="Logo" name="logo" currentUrl={settings.logoUrl} preview={logoPreview} onChange={updatePreview(setLogoPreview)} onClear={clearPreview('logo', setLogoPreview)} /><AssetField label="Banner principal" name="banner" currentUrl={settings.bannerUrl} preview={bannerPreview} onChange={updatePreview(setBannerPreview)} onClear={clearPreview('banner', setBannerPreview)} /></fieldset>
    {result?.success && <p role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">Configurações atualizadas com sucesso.{result.warning ? ` ${result.warning}` : ''}</p>}{result?.error && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{result.error}</p>}
    <button disabled={saving} className="button-primary w-fit px-6 py-4 disabled:opacity-50">{saving ? <><LoaderCircle size={16} className="animate-spin" />Salvando...</> : <><Save size={16} />Salvar configurações</>}</button>
  </form>;
}
