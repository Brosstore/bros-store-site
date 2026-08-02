export default function DashboardSection({ title, description, action, children }) {
  return <section className="mt-10" aria-labelledby={`dashboard-${title.replace(/\s+/g, '-').toLowerCase()}`}>
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><h2 id={`dashboard-${title.replace(/\s+/g, '-').toLowerCase()}`} className="text-xl font-extrabold tracking-tight text-white">{title}</h2>{description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}</div>{action}</div>
    {children}
  </section>;
}
