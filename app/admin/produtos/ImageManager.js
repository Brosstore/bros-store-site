'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, LoaderCircle, Star, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { deleteProductImage, updateImageOrder, uploadProductImage } from './actions';

const validTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxFileSize = 5 * 1024 * 1024;

export default function ImageManager({ productId, initialImages }) {
  const router = useRouter();
  const [images, setImages] = useState(initialImages);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const previewUrls = useRef(new Set());

  useEffect(() => () => previewUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  function revokePreview(item) {
    URL.revokeObjectURL(item.url);
    previewUrls.current.delete(item.url);
  }

  function removeSelectedFile(id) {
    setSelectedFiles((currentFiles) => {
      const item = currentFiles.find((file) => file.id === id);
      if (item) revokePreview(item);
      return currentFiles.filter((file) => file.id !== id);
    });
  }

  function clearSelectedFiles() {
    selectedFiles.forEach(revokePreview);
    setSelectedFiles([]);
    setMessage('');
  }

  async function reorder(nextImages) {
    const previousImages = images;
    setImages(nextImages);
    setBusy(true);
    setMessage('');
    const result = await updateImageOrder({ productId, imageIds: nextImages.map((image) => image.id) });
    if (result.error) {
      setImages(previousImages);
      setMessage(result.error);
    }
    setBusy(false);
  }

  async function upload() {
    if (!selectedFiles.length) return;

    setBusy(true);
    setMessage('');
    const filesToUpload = [...selectedFiles];

    for (const [index, item] of filesToUpload.entries()) {
      setSelectedFiles((currentFiles) => currentFiles.map((file) => (
        file.id === item.id ? { ...file, progress: 10, status: 'uploading' } : file
      )));

      try {
        const formData = new FormData();
        formData.append('productId', productId);
        formData.append('file', item.file);
        formData.append('position', String(images.length + index));

        const result = await uploadProductImage(formData);
        if (result.error) throw new Error(result.error);

        setSelectedFiles((currentFiles) => currentFiles.map((file) => (
          file.id === item.id ? { ...file, progress: 100, status: 'uploaded' } : file
        )));
        if (result.image) setImages((currentImages) => [...currentImages, result.image]);
        router.refresh();
        revokePreview(item);
        setSelectedFiles((currentFiles) => currentFiles.filter((file) => file.id !== item.id));
      } catch (error) {
        setSelectedFiles((currentFiles) => currentFiles.map((file) => (
          file.id === item.id ? { ...file, progress: 0, status: 'error' } : file
        )));
        setMessage(error.message || 'Não foi possível enviar uma das imagens.');
      } finally {
        // Cada envio é finalizado individualmente; os próximos arquivos continuam sendo processados.
      }
    }

    setBusy(false);
  }

  async function remove(image) {
    setBusy(true);
    setMessage('');
    const result = await deleteProductImage({ productId, imageId: image.id });
    if (result.error) setMessage(result.error);
    else setImages((currentImages) => currentImages.filter((item) => item.id !== image.id));
    setBusy(false);
  }

  function select(event) {
    const chosenFiles = Array.from(event.target.files || []);
    const acceptedFiles = chosenFiles.filter((file) => validTypes.has(file.type) && file.size <= maxFileSize);
    setMessage(
      acceptedFiles.length !== chosenFiles.length
        ? 'Alguns arquivos foram ignorados: use JPG, PNG ou WEBP de até 5 MB.'
        : '',
    );

    const filesWithPreview = acceptedFiles.map((file) => {
      const url = URL.createObjectURL(file);
      previewUrls.current.add(url);
      return { id: crypto.randomUUID(), file, url, progress: 0, status: 'ready' };
    });
    setSelectedFiles((currentFiles) => [...currentFiles, ...filesWithPreview]);
    event.target.value = '';
  }

  return (
    <section className="mt-10 border-t border-white/10 pt-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="eyebrow">Galeria</p><h2 className="text-2xl font-extrabold">Imagens</h2></div>
        <label className="button-primary cursor-pointer"><Upload size={16} />Adicionar imagens
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={select} />
        </label>
      </div>

      {selectedFiles.length > 0 && (
        <div className="mt-5 rounded-xl border border-white/10 bg-white/[.025] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-zinc-300">Prévia: {selectedFiles.length} imagem(ns) selecionada(s).</p>
            <button disabled={busy} type="button" onClick={clearSelectedFiles} className="text-xs font-bold uppercase tracking-[.12em] text-zinc-400 transition hover:text-white disabled:opacity-40">Limpar seleção</button>
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            {selectedFiles.map((item) => (
              <div key={item.id} className="relative">
                <Image src={item.url} alt={item.file.name} width={96} height={96} unoptimized className="h-24 w-24 rounded-lg object-cover" />
                <button disabled={busy} type="button" onClick={() => removeSelectedFile(item.id)} className="absolute -right-2 -top-2 rounded-full border border-white/20 bg-ink p-1 text-white transition hover:border-red-400 hover:text-red-200 disabled:opacity-40" aria-label={`Remover ${item.file.name} da prévia`} title="Remover da prévia"><X size={13} /></button>
                <div className="mt-2 w-24"><div className="h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-brand transition-all" style={{ width: `${item.progress}%` }} /></div>
                  <p className={`mt-1 truncate text-[10px] ${item.status === 'error' ? 'text-red-200' : 'text-zinc-400'}`}>
                    {item.status === 'uploading' && `Enviando ${item.progress}%`}{item.status === 'uploaded' && 'Enviada'}{item.status === 'error' && 'Falhou'}{item.status === 'ready' && 'Pronta para envio'}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <button disabled={busy} onClick={upload} type="button" className="button-primary mt-4 px-4 py-3">{busy ? <LoaderCircle size={16} className="animate-spin" /> : <Upload size={16} />}Enviar imagens</button>
        </div>
      )}

      {message && <p role="alert" className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{message}</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((image, index) => (
          <article key={image.id} className="overflow-hidden rounded-xl border border-white/10 bg-white/[.025]">
            <Image src={image.url} alt={`Imagem ${index + 1}`} width={500} height={500} sizes="(max-width: 640px) 100vw, 33vw" className="aspect-square w-full object-cover" />
            <div className="flex flex-wrap gap-2 p-3">
              <button disabled={busy || index === 0} onClick={() => reorder([image, ...images.filter((item) => item.id !== image.id)])} className="rounded-lg border border-white/15 p-2 disabled:opacity-30" title="Tornar principal" aria-label="Tornar imagem principal"><Star size={15} /></button>
              <button disabled={busy || index === 0} onClick={() => { const nextImages = [...images]; [nextImages[index - 1], nextImages[index]] = [nextImages[index], nextImages[index - 1]]; reorder(nextImages); }} className="rounded-lg border border-white/15 p-2 disabled:opacity-30" title="Mover para cima" aria-label="Mover imagem para cima"><ArrowUp size={15} /></button>
              <button disabled={busy || index === images.length - 1} onClick={() => { const nextImages = [...images]; [nextImages[index + 1], nextImages[index]] = [nextImages[index], nextImages[index + 1]]; reorder(nextImages); }} className="rounded-lg border border-white/15 p-2 disabled:opacity-30" title="Mover para baixo" aria-label="Mover imagem para baixo"><ArrowDown size={15} /></button>
              <button disabled={busy} onClick={() => remove(image)} className="ml-auto rounded-lg border border-red-400/30 p-2 text-red-200" title="Excluir" aria-label="Excluir imagem"><Trash2 size={15} /></button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
