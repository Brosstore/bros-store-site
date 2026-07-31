import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
 * Cliente para Server Components, Route Handlers e Server Actions.
 * A sessão do usuário é enviada por cookies e o RLS continua sendo aplicado.
 */
export function createClient() {
  const cookieStore = cookies();
  const { url, key } = getSupabaseConfig();

  return createServerClient(url, key, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set(name, value, options) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Server Components não podem gravar cookies; o middleware futuro
          // ficará responsável pela atualização da sessão.
        }
      },
      remove(name, options) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch {
          // Ver comentário acima sobre Server Components.
        }
      },
    },
  });
}
