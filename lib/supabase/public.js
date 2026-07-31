import { createClient } from '@supabase/supabase-js';

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'As variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY devem estar configuradas.'
    );
  }

  return { url, key };
}

/**
 * Cliente público e sem estado para leitura do catálogo ativo.
 * Não usa cookies, sessão persistente nem privilégios administrativos.
 */
export function createPublicClient() {
  const { url, key } = getSupabaseConfig();

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
