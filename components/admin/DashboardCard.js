import Link from 'next/link';

export default function DashboardCard({ icon: Icon, title, value, description, href, unavailable = false }) {
  const content = <article className="group h-full rounded-2xl border border-white/10 bg-white/[.025] p-5 transition hover:border-brand/40 hover:bg-white/[.04] focus-within:border-brand/50">
    <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-zinc-200">{title}</p><p className="mt-2 text-xs leading-5 text-zinc-500">{description}</p></div><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand"><Icon size={19} aria-hidden="true" /></span></div>
    <strong className="mt-7 block text-3xl tracking-tight text-white">{unavailable ? 'Indisponível' : value}</strong>
  </article>;

  return href ? <Link href={href} className="block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand" aria-label={`${title}: ${unavailable ? 'indisponível' : value}. Abrir módulo.`}>{content}</Link> : content;
}
