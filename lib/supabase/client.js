import { createBrowserClient } from '@supabase/ssr';

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
 * Cliente para componentes Client do Next.js.
 * Não usar para operações privilegiadas: o acesso é controlado pelo RLS.
 */
export function createClient() {
  const { url, key } = getSupabaseConfig();
  return createBrowserClient(url, key);
}
