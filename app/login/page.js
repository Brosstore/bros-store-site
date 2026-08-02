import AuthPanel from './AuthPanel';
import { getSafeCustomerNext } from '../../lib/customerAuthRedirect';

export const metadata = { title: 'Entrar | Bros Store', description: 'Acesse sua conta da Bros Store.', robots: { index: false, follow: false } };

export default function LoginPage({ searchParams }) {
  const nextPath = getSafeCustomerNext(searchParams?.next);
  return <main className="grid min-h-screen place-items-center bg-ink px-5 py-10 text-white"><section className="glass w-full max-w-lg rounded-2xl p-6 shadow-2xl sm:p-8"><a href="/" className="text-xl font-extrabold tracking-[.08em]">BROS<span className="ml-1 text-brand">STORE</span></a><AuthPanel nextPath={nextPath} /></section></main>;
}
