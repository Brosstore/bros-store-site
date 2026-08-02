import Link from 'next/link';

export default function DashboardAlert({ icon: Icon, title, description, href, tone = 'brand' }) {
  const tones = {
    brand: 'border-brand/30 bg-brand/10 text-brand',
    danger: 'border-red-400/30 bg-red-400/10 text-red-200',
    warning: 'border-amber-400/30 bg-amber-400/10 text-amber-100',
  };
  const content = <div className={`flex items-start gap-3 rounded-xl border p-4 ${tones[tone] || tones.brand}`}><Icon size={18} aria-hidden="true" className="mt-0.5 shrink-0" /><div><p className="text-sm font-bold">{title}</p><p className="mt-1 text-xs leading-5 text-zinc-300">{description}</p></div></div>;
  return href ? <Link href={href} className="block rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">{content}</Link> : content;
}
