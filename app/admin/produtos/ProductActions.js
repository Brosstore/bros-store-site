'use client';

import { ExternalLink, LoaderCircle, Pencil, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { deleteProduct } from './actions';

export default function ProductActions({ id, name, slug }) {
  const router = useRouter();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function confirmDelete() {
    setDeleting(true);
    setError('');

    try {
      const result = await deleteProduct(id);
      if (result.error) {
        setError(result.error);
        return;
      }

      setConfirmingDelete(false);
      router.replace('/admin/produtos?sucesso=excluido');
      router.refresh();
    } catch (unexpectedError) {
      setError(unexpectedError.message || 'Não foi possível excluir o produto.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <a href={`/admin/produtos/${id}`} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-zinc-200 transition hover:border-brand hover:text-brand"><Pencil size={14} className="mr-1 inline" />Editar</a>
      <a href={`/produto/${slug}`} target="_blank" rel="noreferrer" className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-zinc-200 transition hover:border-brand hover:text-brand"><ExternalLink size={14} className="mr-1 inline" />Visualizar</a>
      <button type="button" onClick={() => { setError(''); setConfirmingDelete(true); }} className="rounded-lg border border-red-400/30 px-3 py-2 text-xs font-bold text-red-200 transition hover:border-red-400 hover:bg-red-400/10"><Trash2 size={14} className="mr-1 inline" />Excluir</button>

      {confirmingDelete && (
        <div role="dialog" aria-modal="true" aria-labelledby={`delete-title-${slug}`} className="fixed inset-0 z-[100] grid place-items-center bg-black/75 px-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><p className="eyebrow">Confirmar ação</p><h2 id={`delete-title-${slug}`} className="text-2xl font-extrabold">Excluir produto?</h2></div>
              <button disabled={deleting} type="button" onClick={() => setConfirmingDelete(false)} aria-label="Fechar" className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white disabled:opacity-40"><X size={19} /></button>
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-400">Você está prestes a excluir <strong className="text-white">{name}</strong>, suas imagens e seus arquivos armazenados. Esta ação não pode ser desfeita.</p>
            {error && <p role="alert" className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}
            <div className="mt-7 flex justify-end gap-3">
              <button disabled={deleting} type="button" onClick={() => setConfirmingDelete(false)} className="button-dark px-4 py-3 disabled:opacity-40">Cancelar</button>
              <button disabled={deleting} type="button" onClick={confirmDelete} className="rounded-xl bg-red-500/15 px-4 py-3 text-xs font-extrabold uppercase tracking-[.12em] text-red-200 transition hover:bg-red-500/25 disabled:opacity-50">
                {deleting ? <><LoaderCircle size={15} className="mr-2 inline animate-spin" />Excluindo...</> : <><Trash2 size={15} className="mr-2 inline" />Excluir produto</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
