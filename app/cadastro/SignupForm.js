'use client';

import { LoaderCircle, UserPlus } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { logAuthError, signupErrorMessage } from '../../lib/authMessages';
import { getSafeCustomerNext } from '../../lib/customerAuthRedirect';
import { createClient } from '../../lib/supabase/client';

function normalizePhone(value) {
  const compact = value.replace(/[^\d+]/g, '');
  return compact.startsWith('+') ? `+${compact.slice(1).replace(/\+/g, '')}` : compact.replace(/\+/g, '');
}

export default function SignupForm({ nextPath, onLogin }) {
  const router = useRouter();
  const params = useSearchParams();
  const firstFieldRef = useRef(null);
  const [values, setValues] = useState({ nome: '', sobrenome: '', email: '', telefone: '', senha: '', confirmacao: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const destination = getSafeCustomerNext(nextPath || params.get('next'));

  function updateValue(name, value) { setValues((current) => ({ ...current, [name]: name === 'telefone' ? normalizePhone(value) : value })); }
  function showError(value) { setError(value); window.setTimeout(() => firstFieldRef.current?.focus(), 0); }
  const field = (name, label, type = 'text') => <label className="block text-sm font-semibold text-zinc-200">{label}<input ref={name === 'nome' ? firstFieldRef : undefined} required={name !== 'telefone'} type={type} autoComplete={name === 'email' ? 'email' : name === 'senha' ? 'new-password' : name === 'confirmacao' ? 'new-password' : name === 'telefone' ? 'tel' : name === 'nome' ? 'given-name' : name === 'sobrenome' ? 'family-name' : undefined} value={values[name]} onChange={(event) => updateValue(name, event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3.5 text-white outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20" /></label>;

  async function submit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (values.senha.length < 6) { showError('A senha precisa ter ao menos 6 caracteres.'); return; }
    if (values.senha !== values.confirmacao) { showError('A confirmação de senha não confere.'); return; }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signupError } = await supabase.auth.signUp({ email: values.email.trim(), password: values.senha, options: { data: { nome: values.nome.trim(), sobrenome: values.sobrenome.trim(), telefone: normalizePhone(values.telefone) } } });
      if (signupError) throw signupError;
      if (data.session) {
        router.replace(destination);
        router.refresh();
        return;
      }
      setMessage('Conta criada. Confirme seu e-mail para entrar e continuar de onde parou.');
    } catch (signupError) {
      logAuthError('cadastro-cliente', signupError);
      showError(signupErrorMessage(signupError));
    } finally {
      setLoading(false);
    }
  }

  const loginHref = destination === '/minha-conta' ? '/login' : `/login?next=${encodeURIComponent(destination)}`;
  return <form onSubmit={submit} className="mt-6 space-y-5"><div className="grid gap-5 sm:grid-cols-2">{field('nome', 'Nome')}{field('sobrenome', 'Sobrenome')}</div>{field('email', 'E-mail', 'email')}{field('telefone', 'Telefone', 'tel')}{field('senha', 'Senha', 'password')}{field('confirmacao', 'Confirmar senha', 'password')}{error && <p role="alert" aria-live="assertive" className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}{message && <p role="status" aria-live="polite" className="rounded-lg border border-brand/30 bg-brand/10 px-4 py-3 text-sm text-brand">{message}</p>}<button disabled={loading} type="submit" className="button-primary w-full disabled:cursor-not-allowed disabled:opacity-70">{loading ? <LoaderCircle size={17} className="animate-spin" /> : <UserPlus size={17} />} {loading ? 'Criando conta...' : 'Criar conta'}</button><p className="text-center text-sm text-zinc-400">Já possui conta? {onLogin ? <button type="button" onClick={onLogin} className="font-bold text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Entrar</button> : <a href={loginHref} className="font-bold text-brand">Entrar</a>}</p></form>;
}
