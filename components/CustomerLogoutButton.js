'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '../lib/supabase/client';

export default function CustomerLogoutButton() { const router = useRouter(); const [loading, setLoading] = useState(false); async function leave() { setLoading(true); const supabase = createClient(); await supabase.auth.signOut(); router.replace('/'); router.refresh(); } return <button type="button" onClick={leave} disabled={loading} className="button-dark px-4 py-3 disabled:opacity-50"><LogOut size={15}/>{loading ? 'Saindo...' : 'Sair da conta'}</button>; }
