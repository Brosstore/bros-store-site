export default function DashboardTable({ caption, columns, children }) {
  return <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[.02]"><table className="min-w-[640px] w-full text-left text-sm"><caption className="sr-only">{caption}</caption><thead className="bg-white/[.04] text-[11px] font-bold uppercase tracking-wider text-zinc-400"><tr>{columns.map((column) => <th key={column} scope="col" className="px-4 py-3.5">{column}</th>)}</tr></thead><tbody className="divide-y divide-white/10">{children}</tbody></table></div>;
}
