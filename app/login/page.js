import LoginForm from './LoginForm';

export const metadata = { title: 'Entrar | Bros Store', description: 'Acesse sua conta da Bros Store.', robots: { index: false, follow: false } };

export default function LoginPage() {
  return <main className="grid min-h-screen place-items-center bg-ink px-5 py-10 text-white"><section className="glass w-full max-w-md rounded-2xl p-6 shadow-2xl sm:p-8"><a href="/" className="text-xl font-extrabold tracking-[.08em]">BROS<span className="ml-1 text-brand">STORE</span></a><p className="eyebrow mt-10">Área do cliente</p><h1 className="text-3xl font-extrabold tracking-tight">Entre na sua conta.</h1><p className="mt-3 text-sm leading-6 text-zinc-400">Acompanhe seus dados e seus endereços com segurança.</p><LoginForm /></section></main>;
}
