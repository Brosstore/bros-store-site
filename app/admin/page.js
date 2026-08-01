import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';

export default async function AdminIndexPage() {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect('/admin/login');
  const { data: admin, error: adminError } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
  if (adminError) { console.error('[admin] Falha ao validar acesso administrativo.', adminError); redirect('/admin/login'); }
  if (!admin) redirect('/admin/login?unauthorized=1');
  redirect('/admin/dashboard');
}
