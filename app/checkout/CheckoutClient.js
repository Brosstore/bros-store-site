'use client';

import Image from 'next/image';
import { Check, CreditCard, LoaderCircle, Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '../../components/cart/CartContext';
import { formatCartPrice } from '../../components/cart/cartUtils';
import { createCheckoutAddress, finalizeOrder } from './actions';

const paymentMethods = [
  ['pix', 'Pix'],
  ['dinheiro', 'Dinheiro'],
  ['cartao_na_entrega', 'Cartão na entrega'],
  ['mercado_pago_pix', 'Mercado Pago — Pix'],
  ['mercado_pago_cartao', 'Mercado Pago — Cartão'],
];
const mercadoPagoMethods = new Set(['mercado_pago_pix', 'mercado_pago_cartao']);
const emptyAddress = { apelido: '', destinatario: '', cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', principal: false };

function createIdempotencyKey() {
  const browserCrypto = window.crypto;
  if (typeof browserCrypto.randomUUID === 'function') return browserCrypto.randomUUID();

  const bytes = new Uint8Array(16);
  browserCrypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function isMercadoPagoUrl(value) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const allowedDomains = ['mercadopago.com', 'mercadopago.com.br'];
    const hasAllowedDomain = allowedDomains.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    );

    return url.protocol === 'https:'
      && !url.username
      && !url.password
      && hasAllowedDomain;
  } catch {
    return false;
  }
}

function getMercadoPagoRedirectUrl(payload) {
  return typeof payload?.redirect_url === 'string' && isMercadoPagoUrl(payload.redirect_url)
    ? payload.redirect_url
    : '';
}

function apiErrorMessage(status, payload) {
  if (status === 401) return 'Sua sessão expirou. Entre novamente para continuar.';
  if (status === 400) return 'Não foi possível iniciar o pagamento. Revise os dados do pedido e tente novamente.';
  if (status >= 500) return 'O pagamento online está indisponível no momento. Tente novamente em instantes.';
  return typeof payload?.error === 'string' ? payload.error : 'Não foi possível iniciar o pagamento.';
}

export default function CheckoutClient({ initialAddresses }) {
  const router = useRouter();
  const { items, hydrated, subtotalCents, clearCart } = useCart();
  const [addresses, setAddresses] = useState(initialAddresses);
  const [addressId, setAddressId] = useState(initialAddresses.find((address) => address.principal)?.id || initialAddresses[0]?.id || '');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [notes, setNotes] = useState('');
  const [newAddress, setNewAddress] = useState(null);
  const [error, setError] = useState('');
  const [savingAddress, setSavingAddress] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const paymentAttemptKeyRef = useRef(null);
  const cartSignature = useMemo(
    () => items.map((item) => `${item.key}:${item.quantity}`).join('|'),
    [items],
  );
  const isMercadoPago = mercadoPagoMethods.has(paymentMethod);
  const inputClass = 'mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20';

  useEffect(() => {
    paymentAttemptKeyRef.current = null;
  }, [cartSignature]);

  function resetPaymentAttempt() {
    paymentAttemptKeyRef.current = null;
  }

  function selectAddress(id) {
    resetPaymentAttempt();
    setAddressId(id);
  }

  function selectPaymentMethod(method) {
    resetPaymentAttempt();
    setPaymentMethod(method);
  }

  async function saveAddress(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setSavingAddress(true);
    setError('');
    const result = await createCheckoutAddress(new FormData(form));

    if (result.error) {
      setError(result.error);
    } else {
      setAddresses((current) => [...current, result.address]);
      selectAddress(result.address.id);
      setNewAddress(null);
    }

    setSavingAddress(false);
  }

  function buildOrderItems() {
    return items.map(({ productId, selectedSize, selectedColor, quantity }) => ({
      productId,
      selectedSize,
      selectedColor,
      quantity,
    }));
  }

  async function startMercadoPagoPayment(orderItems) {
    const idempotencyKey = paymentAttemptKeyRef.current || createIdempotencyKey();
    paymentAttemptKeyRef.current = idempotencyKey;

    let response;
    try {
      response = await fetch('/api/mercado-pago/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addressId,
          notes,
          items: orderItems,
          paymentMethod,
          idempotencyKey,
        }),
      });
    } catch {
      throw new Error('Não foi possível conectar ao pagamento online. Tente novamente.');
    }

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(apiErrorMessage(response.status, payload));
    }

    const redirectUrl = getMercadoPagoRedirectUrl(payload);
    if (!redirectUrl) {
      throw new Error('Não foi possível abrir o ambiente seguro de pagamento. Tente novamente.');
    }

    paymentAttemptKeyRef.current = null;
    window.location.assign(redirectUrl);
  }

  async function submitOrder() {
    if (submitting) return;

    setError('');
    if (!addressId) {
      setError('Selecione ou cadastre um endereço.');
      return;
    }
    if (!items.length) {
      setError('Seu carrinho está vazio.');
      return;
    }

    const orderItems = buildOrderItems();
    setSubmitting(true);

    if (isMercadoPago) {
      try {
        await startMercadoPagoPayment(orderItems);
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : 'Não foi possível iniciar o pagamento.');
        setSubmitting(false);
      }
      return;
    }

    const result = await finalizeOrder({ addressId, paymentMethod, notes, items: orderItems });
    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    clearCart();
    router.replace(`/pedido-confirmado/${result.id}`);
    router.refresh();
  }

  if (!hydrated) return <section className="section flex min-h-[60vh] items-center justify-center"><LoaderCircle className="animate-spin text-brand" /></section>;
  if (!items.length) return <section className="section flex min-h-[60vh] flex-col items-center justify-center text-center"><p className="eyebrow">Checkout</p><h1 className="section-title">SEU CARRINHO ESTÁ <span className="text-brand">VAZIO.</span></h1><a href="/produtos" className="button-primary mt-8">Continuar comprando</a></section>;

  return <section className="section">
    <p className="eyebrow">Finalização segura</p>
    <h1 className="section-title">FINALIZE SEU <span className="text-brand">PEDIDO.</span></h1>
    <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
      <div className="space-y-7">
        <section className="glass rounded-2xl p-6 sm:p-7">
          <div className="flex items-center justify-between gap-4"><div><p className="eyebrow mb-1">Entrega</p><h2 className="text-xl font-extrabold">SELECIONE O ENDEREÇO</h2></div><button type="button" onClick={() => setNewAddress(emptyAddress)} className="button-dark px-4 py-3"><Plus size={16} />Adicionar</button></div>
          <div className="mt-6 grid gap-3">{addresses.map((address) => <button type="button" key={address.id} onClick={() => selectAddress(address.id)} className={`flex items-start gap-4 rounded-xl border p-4 text-left transition ${addressId === address.id ? 'border-brand bg-brand/10' : 'border-white/10 hover:border-white/30'}`}><span className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${addressId === address.id ? 'border-brand bg-brand text-ink' : 'border-white/30'}`}>{addressId === address.id && <Check size={13} />}</span><span><strong className="text-sm">{address.apelido}{address.principal && ' · Principal'}</strong><span className="mt-1 block text-sm leading-6 text-zinc-400">{address.destinatario} · {address.rua}, {address.numero}<br />{address.bairro} · {address.cidade}/{address.estado} · CEP {address.cep}</span></span></button>)}</div>
          {!addresses.length && <p className="mt-5 text-sm text-zinc-500">Cadastre seu endereço para continuar.</p>}
          {newAddress && <form onSubmit={saveAddress} className="mt-6 border-t border-white/10 pt-6"><div className="flex items-center justify-between"><h3 className="font-extrabold">Novo endereço</h3><button type="button" onClick={() => setNewAddress(null)} className="text-sm text-zinc-400 hover:text-white">Cancelar</button></div><div className="mt-5 grid gap-4 sm:grid-cols-2">{[['apelido', 'Apelido'], ['destinatario', 'Destinatário'], ['cep', 'CEP'], ['rua', 'Rua'], ['numero', 'Número'], ['complemento', 'Complemento'], ['bairro', 'Bairro'], ['cidade', 'Cidade'], ['estado', 'Estado']].map(([key, label]) => <label key={key} className="text-sm font-semibold">{label}<input required={key !== 'complemento'} name={key} value={newAddress[key]} onChange={(event) => setNewAddress({ ...newAddress, [key]: event.target.value })} className={inputClass} /></label>)}</div><label className="mt-5 flex items-center gap-3 text-sm font-semibold"><input name="principal" type="checkbox" checked={newAddress.principal} onChange={(event) => setNewAddress({ ...newAddress, principal: event.target.checked })} className="h-4 w-4 accent-[#F5C518]" />Definir como principal</label><button disabled={savingAddress} className="button-primary mt-5 disabled:opacity-70">{savingAddress && <LoaderCircle size={15} className="animate-spin" />}Salvar endereço</button></form>}
        </section>
        <section className="glass rounded-2xl p-6 sm:p-7">
          <p className="eyebrow">Pagamento</p><h2 className="text-xl font-extrabold">FORMA DE PAGAMENTO</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">{paymentMethods.map(([value, label]) => <button type="button" key={value} onClick={() => selectPaymentMethod(value)} aria-pressed={paymentMethod === value} className={`rounded-xl border p-4 text-sm font-bold transition ${paymentMethod === value ? 'border-brand bg-brand text-ink' : 'border-white/10 text-zinc-300 hover:border-brand'}`}><CreditCard size={17} className="mx-auto mb-2" />{label}</button>)}</div>
          <label className="mt-6 block text-sm font-semibold">Observações <span className="font-normal text-zinc-500">(opcional)</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} rows={3} className={inputClass} placeholder="Alguma informação para a entrega?" /></label>
        </section>
      </div>
      <aside className="rounded-2xl border border-white/10 bg-white/[.04] p-6 lg:sticky lg:top-24">
        <h2 className="text-lg font-extrabold">RESUMO DO PEDIDO</h2>
        <ul className="mt-5 divide-y divide-white/10">{items.map((item) => <li key={item.key} className="flex gap-3 py-4"><div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-900">{item.image && <Image src={item.image} alt={item.name} fill sizes="56px" className="object-contain" />}</div><div className="min-w-0 flex-1"><p className="text-sm font-bold">{item.name}</p><p className="mt-1 text-xs text-zinc-500">{[item.selectedSize && `Tam. ${item.selectedSize}`, item.selectedColor && `Cor ${item.selectedColor}`, `${item.quantity} un.`].filter(Boolean).join(' · ')}</p><p className="mt-1 text-sm font-extrabold text-brand">{formatCartPrice(item.price_cents * item.quantity)}</p></div></li>)}</ul>
        <dl className="mt-4 space-y-3 border-t border-white/10 pt-5 text-sm"><div className="flex justify-between"><dt className="text-zinc-400">Subtotal</dt><dd>{formatCartPrice(subtotalCents)}</dd></div><div className="flex justify-between"><dt className="text-zinc-400">Frete</dt><dd>R$ 0,00</dd></div><div className="flex justify-between"><dt className="text-zinc-400">Desconto</dt><dd>R$ 0,00</dd></div><div className="flex justify-between border-t border-white/10 pt-4 text-base font-extrabold"><dt>Total</dt><dd className="text-brand">{formatCartPrice(subtotalCents)}</dd></div></dl>
        {error && <p role="alert" aria-live="polite" className="mt-5 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}
        <button type="button" disabled={submitting} onClick={submitOrder} className="button-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-70">{submitting && <LoaderCircle size={16} className="animate-spin" />}{submitting ? (isMercadoPago ? 'Redirecionando para o Mercado Pago...' : 'Finalizando...') : 'Confirmar pedido'}</button>
      </aside>
    </div>
  </section>;
}
