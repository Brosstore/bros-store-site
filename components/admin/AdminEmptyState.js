import { Inbox } from 'lucide-react';
export default function AdminEmptyState({message='Nenhum registro encontrado.',action}){return <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-zinc-400"><Inbox className="mx-auto text-brand"/><p className="mt-3 text-sm">{message}</p>{action}</div>;}
