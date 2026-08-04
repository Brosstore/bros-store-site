import SignupForm from './SignupForm';
import { getSafeCustomerNext } from '../../lib/customerAuthRedirect';

export const metadata = { title: 'Criar conta | Bros Store', description: 'Crie sua conta na Bros Store.', robots: { index: false, follow: false } };

export default function SignupPage({ searchParams }) {
  const nextPath = getSafeCustomerNext(searchParams?.next);
  return <main className="grid min-h-screen place-items-center bg-ink px-5 py-10 text-white"><section className="glass w-full max-w-lg rounded-2xl p-6 shadow-2xl sm:p-8"><a href="/" className="text-xl font-extrabold tracking-[.08em]">BROS<span className="ml-1 text-brand">STORE</span></a><p className="eyebrow mt-10">Área do cliente</p><h1 className="text-3xl font-extrabold tracking-tight">Crie sua conta.</h1><p className="mt-3 text-sm leading-6 text-zinc-400">{nextPath === '/checkout' ? 'Crie sua conta para continuar sua compra.' : 'Seu estilo, seus dados e seus endereços em um só lugar.'}</p><SignupForm nextPath={nextPath} /></section></main>;
}
