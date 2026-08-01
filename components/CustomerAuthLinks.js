'use client';

import { UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '../lib/supabase/client';

export default function CustomerAuthLinks({ mobile = false }) {
  const [user, setUser] = useState(null);
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));
    return () => subscription.unsubscribe();
  }, []);
  return <a href={user ? '/minha-conta' : '/login'} className={mobile ? 'mt-5 flex items-center gap-2 border-b border-white/10 pb-5 text-lg font-extrabold text-brand' : 'hidden items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-brand sm:flex'}><UserRound size={mobile ? 18 : 15}/>{user ? 'Minha conta' : 'Entrar'}</a>;
}
