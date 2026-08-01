'use client';

import { LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { updateOrderStatus } from './actions';

const statuses = [['novo','Novo'],['confirmado','Confirmado'],['em_preparo','Em preparo'],['saiu_para_entrega','Saiu para entrega'],['entregue','Entregue'],['cancelado','Cancelado']];
export default function OrderStatusForm({ id, currentStatus }) { const router = useRouter(); const [status, setStatus] = useState(currentStatus); const [loading, setLoading] = useState(false); const [message, setMessage] = useState(''); async function save() { setLoading(true); setMessage(''); const result = await updateOrderStatus(id, status); setMessage(result.error || result.success); setLoading(false); if (result.success) router.refresh(); } return <div className="flex flex-wrap items-center gap-3"><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Status do pedido" className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-brand">{statuses.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select><button type="button" disabled={loading || status === currentStatus} onClick={save} className="button-primary px-4 py-3 disabled:opacity-50">{loading && <LoaderCircle size={15} className="animate-spin"/>}Atualizar</button>{message && <p role="status" className={`w-full text-sm ${message.includes('sucesso') ? 'text-brand' : 'text-red-300'}`}>{message}</p>}</div>; }
