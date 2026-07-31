'use client';

import { LoaderCircle, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '../../../lib/supabase/client';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError('Não foi possível entrar. Confira seu e-mail e senha.');
        return;
      }

      router.replace('/admin/dashboard');
      router.refresh();
    } catch {
      setError('Não foi possível conectar ao painel agora. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return <form onSubmit={handleSubmit} className="mt-8 space-y-5">
    <label className="block text-sm font-semibold text-zinc-200">E-mail
      <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3.5 text-white outline-none transition placeholder:text-zinc-600 focus:border-brand focus:ring-2 focus:ring-brand/20" placeholder="voce@exemplo.com" />
    </label>
    <label className="block text-sm font-semibold text-zinc-200">Senha
      <input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3.5 text-white outline-none transition placeholder:text-zinc-600 focus:border-brand focus:ring-2 focus:ring-brand/20" placeholder="Sua senha" />
    </label>
    {error && <p role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}
    <button disabled={isSubmitting} type="submit" className="button-primary w-full disabled:cursor-not-allowed disabled:opacity-70">
      {isSubmitting ? <LoaderCircle size={17} className="animate-spin" /> : <LogIn size={17} />} {isSubmitting ? 'Entrando...' : 'Entrar'}
    </button>
  </form>;
}
