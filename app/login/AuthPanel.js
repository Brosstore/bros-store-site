'use client';

import { LogIn, UserPlus } from 'lucide-react';
import { useState } from 'react';
import LoginForm from './LoginForm';
import SignupForm from '../cadastro/SignupForm';

export default function AuthPanel({ nextPath }) {
  const [mode, setMode] = useState('login');
  const isCheckout = nextPath === '/checkout';

  return <>
    <p className="eyebrow mt-10">Área do cliente</p>
    <h1 className="text-3xl font-extrabold tracking-tight">{mode === 'login' ? 'Entre na sua conta.' : 'Crie sua conta.'}</h1>
    <p className="mt-3 text-sm leading-6 text-zinc-400">{isCheckout ? 'Entre ou crie sua conta para continuar sua compra.' : 'Acompanhe seus dados, endereços e pedidos com segurança.'}</p>
    <div role="tablist" aria-label="Acesso à conta" className="mt-8 grid grid-cols-2 rounded-xl border border-white/10 bg-black/30 p-1">
      <button id="tab-entrar" type="button" role="tab" aria-selected={mode === 'login'} aria-controls="painel-entrar" onClick={() => setMode('login')} className={`flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${mode === 'login' ? 'bg-brand text-ink' : 'text-zinc-400 hover:text-white'}`}><LogIn size={16} />Entrar</button>
      <button id="tab-cadastro" type="button" role="tab" aria-selected={mode === 'signup'} aria-controls="painel-cadastro" onClick={() => setMode('signup')} className={`flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${mode === 'signup' ? 'bg-brand text-ink' : 'text-zinc-400 hover:text-white'}`}><UserPlus size={16} />Criar conta</button>
    </div>
    {mode === 'login' ? <div id="painel-entrar" role="tabpanel" aria-labelledby="tab-entrar"><LoginForm nextPath={nextPath} onCreateAccount={() => setMode('signup')} /></div> : <div id="painel-cadastro" role="tabpanel" aria-labelledby="tab-cadastro"><SignupForm nextPath={nextPath} onLogin={() => setMode('login')} /></div>}
  </>;
}
