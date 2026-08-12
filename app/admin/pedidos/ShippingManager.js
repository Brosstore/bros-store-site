'use client';

import { ExternalLink, LoaderCircle, PackageCheck, RefreshCw, ShoppingCart } from 'lucide-react';
import { useRef, useState } from 'react';
import { openShippingLabel, prepareShippingLabel, purchaseShippingLabel, refreshShippingTracking } from './actions';

export default function ShippingManager({ orderId, shipment, canPrepare, canPurchase }) {
  const [pending, setPending] = useState('');
  const [message, setMessage] = useState(null);
  const keyRef = useRef(shipment?.purchase_idempotency_key || null);
  async function run(name, action) {
    if (pending) return;
    setPending(name); setMessage(null);
    try { const result = await action(); setMessage(result); }
    catch { setMessage({ error: 'Não foi possível concluir a operação.' }); }
    finally { setPending(''); }
  }
  function purchase() {
    if (!window.confirm('Esta ação comprará a etiqueta no Melhor Envio usando o saldo da conta. Deseja continuar?')) return;
    if (!keyRef.current) keyRef.current = crypto.randomUUID();
    run('purchase', async () => { const result = await purchaseShippingLabel(orderId, keyRef.current); if (result.success) keyRef.current = null; return result; });
  }
  function openLabel() { run('open', async () => { const result = await openShippingLabel(orderId); if (result.url) { const opened = window.open(result.url, '_blank', 'noopener,noreferrer'); if (!opened) return { error: 'Permita pop-ups para abrir a etiqueta.' }; return { success: 'Etiqueta aberta em uma nova aba.' }; } return result; }); }
  return <div className="mt-5 grid gap-3">
    {canPrepare && <button type="button" disabled={Boolean(pending)} onClick={() => run('prepare', () => prepareShippingLabel(orderId))} className="button-dark w-full disabled:opacity-50">{pending === 'prepare' ? <LoaderCircle size={16} className="animate-spin"/> : <ShoppingCart size={16}/>}Preparar etiqueta</button>}
    {canPurchase && <button type="button" disabled={Boolean(pending)} onClick={purchase} className="button-primary w-full disabled:opacity-50">{pending === 'purchase' ? <LoaderCircle size={16} className="animate-spin"/> : <PackageCheck size={16}/>}Comprar e gerar etiqueta</button>}
    {shipment?.label_status === 'gerada' && <button type="button" disabled={Boolean(pending)} onClick={openLabel} className="button-dark w-full disabled:opacity-50">{pending === 'open' ? <LoaderCircle size={16} className="animate-spin"/> : <ExternalLink size={16}/>}Visualizar etiqueta</button>}
    {shipment?.external_order_id && <button type="button" disabled={Boolean(pending)} onClick={() => run('tracking', () => refreshShippingTracking(orderId))} className="button-dark w-full disabled:opacity-50">{pending === 'tracking' ? <LoaderCircle size={16} className="animate-spin"/> : <RefreshCw size={16}/>}Atualizar rastreamento</button>}
    {message?.success && <p role="status" className="text-sm text-emerald-300">{message.success}</p>}{message?.error && <p role="alert" className="text-sm text-red-300">{message.error}</p>}
  </div>;
}
