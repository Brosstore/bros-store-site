import { Clock3, MapPin, PackageCheck, Truck } from 'lucide-react';
import { formatCartPrice } from '../cart/cartUtils';

const labels = { confirmado: 'Confirmado', em_preparacao: 'Em preparação', em_preparo: 'Em preparação', pronto_para_envio: 'Pronto para envio', enviado: 'Enviado', saiu_para_entrega: 'Saiu para entrega', entregue: 'Entregue', cancelado: 'Cancelado' };
function estimate(order) { const min=order.shipping_estimated_days_min,max=order.shipping_estimated_days_max; if(!min&&!max)return 'Prazo não informado'; return min===max?`${min} dia(s) útil(eis)`:`${min||max}–${max||min} dias úteis`; }

export default function ShippingSummary({ order, address, compact = false }) {
  const shipment = Array.isArray(order.shipments) ? order.shipments[0] : order.shipments || null;
  const events = [...(shipment?.shipment_events || [])].sort((a,b)=>new Date(b.occurred_at)-new Date(a.occurred_at));
  const status = shipment?.logistics_status || order.status;
  return <section className="glass rounded-2xl p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">Entrega</p><h2 className="text-lg font-extrabold">{order.shipping_service_name || 'Entrega combinada'}</h2></div><span className="rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-bold text-brand">{labels[status] || status}</span></div>
    <div className={`mt-5 grid gap-4 text-sm text-zinc-400 ${compact?'':'sm:grid-cols-2'}`}><p className="flex gap-2"><Truck size={17} className="shrink-0 text-brand"/><span>{shipment?.carrier || order.shipping_quote_metadata?.company || (order.shipping_provider==='melhor_envio'?'Melhor Envio':'Entrega própria')}<br/><strong className="text-white">{formatCartPrice(order.shipping || 0)}</strong></span></p><p className="flex gap-2"><Clock3 size={17} className="shrink-0 text-brand"/><span>Prazo estimado<br/><strong className="text-white">{estimate(order)}</strong></span></p>{shipment?.tracking_code && <p className="flex gap-2 sm:col-span-2"><PackageCheck size={17} className="shrink-0 text-brand"/><span>Código de rastreamento<br/><strong className="break-all text-white">{shipment.tracking_code}</strong></span></p>}{address && <p className="flex gap-2 sm:col-span-2"><MapPin size={17} className="shrink-0 text-brand"/><span>{address.rua}, {address.numero}{address.complemento?` · ${address.complemento}`:''}<br/>{address.bairro} · {address.cidade}/{address.estado} · CEP {address.cep}</span></p>}</div>
    {events.length>0&&<ol className="mt-5 grid gap-3 border-t border-white/10 pt-4">{events.slice(0,6).map(event=><li key={event.id} className="grid gap-1 text-sm sm:grid-cols-[1fr_auto]"><span>{event.description||event.status}</span><time className="text-xs text-zinc-500">{new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(event.occurred_at))}</time></li>)}</ol>}
  </section>;
}
