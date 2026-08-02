'use client';

import { LoaderCircle, LogIn, Mail } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { authErrorMessage, logAuthError } from '../../lib/authMessages';
import { getSafeCustomerNext } from '../../lib/customerAuthRedirect';
import { createClient } from '../../lib/supabase/client';

export default function LoginForm({ nextPath, onCreateAccount }) {
  const router = useRouter();
  const params = useSearchParams();
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recovery, setRecovery] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const destination = getSafeCustomerNext(nextPath || params.get('next'));

  function showError(value, focus = 'email') {
    setError(value);
    window.setTimeout(() => (focus === 'password' ? passwordRef.current : emailRef.current)?.focus(), 0);
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!email.trim()) { showError('Informe seu e-mail.'); return; }
    if (!recovery && !password) { showError('Informe sua senha.', 'password'); return; }
    setLoading(true);
    try {
      const supabase = createClient();
      if (recovery) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/login?next=${encodeURIComponent(destination)}` });
        if (resetError) logAuthError('recuperacao-cliente', resetError);
        setMessage('Se houver uma conta com este e-mail, enviaremos instruções para recuperar a senha.');
        return;
      }
      await supabase.auth.signOut();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) throw signInError;
      router.replace(destination);
      router.refresh();
    } catch (authError) {
      logAuthError('login-cliente', authError);
      showError(authErrorMessage(authError), 'password');
    } finally {
      setLoading(false);
    }
  }

  return <form onSubmit={submit} className="mt-6 space-y-5">
    <label className="block text-sm font-semibold text-zinc-200">E-mail<input ref={emailRef} required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3.5 text-white outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20" /></label>
    {!recovery && <label className="block text-sm font-semibold text-zinc-200">Senha<input ref={passwordRef} required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3.5 text-white outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20" /></label>}
    {error && <p role="alert" aria-live="assertive" className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}
    {message && <p role="status" aria-live="polite" className="rounded-lg border border-brand/30 bg-brand/10 px-4 py-3 text-sm text-brand">{message}</p>}
    <button disabled={loading} className="button-primary w-full disabled:cursor-not-allowed disabled:opacity-70">{loading ? <LoaderCircle size={17} className="animate-spin" /> : recovery ? <Mail size={17} /> : <LogIn size={17} />} {loading ? 'Aguarde...' : recovery ? 'Enviar instruções' : 'Entrar'}</button>
    <div className="flex flex-wrap justify-between gap-3 text-sm"><button type="button" onClick={() => { setRecovery((value) => !value); setError(''); setMessage(''); }} className="text-zinc-400 transition hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">{recovery ? 'Voltar ao login' : 'Esqueci minha senha'}</button>{!recovery && <button type="button" onClick={onCreateAccount} className="font-bold text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Criar conta</button>}</div>
  </form>;
}
