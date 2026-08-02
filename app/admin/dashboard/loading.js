export default function DashboardLoading() {
  return <main className="min-h-screen bg-ink px-5 py-8 text-white sm:px-8 lg:px-12"><section className="mx-auto max-w-7xl pt-5"><div className="h-4 w-24 animate-pulse rounded bg-white/10" /><div className="mt-4 h-12 w-80 max-w-full animate-pulse rounded bg-white/10" /><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-44 animate-pulse rounded-2xl border border-white/10 bg-white/[.03]" />)}</div></section></main>;
}
