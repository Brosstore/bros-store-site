'use client';

import { ExternalLink, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';

export default function ProductActions({ id, name, slug }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return <div className="flex flex-wrap items-center justify-end gap-2">
    <a href={`/admin/produtos/${id}`} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-zinc-200 transition hover:border-brand hover:text-brand"><Pencil size={14} className="mr-1 inline" />Editar</a>
    <a href={`/produto/${slug}`} target="_blank" rel="noreferrer" className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-zinc-200 transition hover:border-brand hover:text-brand"><ExternalLink size={14} className="mr-1 inline" />Visualizar</a>
    <button type="button" onClick={() => setConfirmingDelete(true)} className="rounded-lg border border-red-400/30 px-3 py-2 text-xs font-bold text-red-200 transition hover:border-red-400 hover:bg-red-400/10"><Trash2 size={14} className="mr-1 inline" />Excluir</button>
    {confirmingDelete && <div role="dialog" aria-modal="true" aria-labelledby={`delete-title-${slug}`} className="fixed inset-0 z-[100] grid place-items-center bg-black/75 px-5 backdrop-blur-sm"><div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111] p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Confirmar ação</p><h2 id={`delete-title-${slug}`} className="text-2xl font-extrabold">Excluir produto?</h2></div><button type="button" onClick={() => setConfirmingDelete(false)} aria-label="Fechar" className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"><X size={19} /></button></div><p className="mt-4 text-sm leading-6 text-zinc-400">Você está prestes a excluir <strong className="text-white">{name}</strong>. Nesta versão, nenhuma exclusão será realizada.</p><div className="mt-7 flex justify-end gap-3"><button type="button" onClick={() => setConfirmingDelete(false)} className="button-dark px-4 py-3">Cancelar</button><button type="button" onClick={() => setConfirmingDelete(false)} className="rounded-xl bg-red-500/15 px-4 py-3 text-xs font-extrabold uppercase tracking-[.12em] text-red-200 transition hover:bg-red-500/25">Entendi</button></div></div></div>}
  </div>;
}
