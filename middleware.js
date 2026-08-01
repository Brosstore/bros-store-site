import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

function loginRedirect(request, path, unauthorized = false) {
  const url = request.nextUrl.clone();
  url.pathname = '/admin/login';
  url.search = '';
  url.searchParams.set('next', `${path}${request.nextUrl.search}`);
  if (unauthorized) url.searchParams.set('unauthorized', '1');
  return NextResponse.redirect(url);
}

export async function middleware(request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next({ request });
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, { cookies: { getAll: () => request.cookies.getAll(), setAll(cookiesToSet) { cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value)); response = NextResponse.next({ request }); cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options)); } } });
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname; const isAdmin = path === '/admin' || path.startsWith('/admin/'); const isAdminLogin = path === '/admin/login'; const isCustomerProtected = path === '/minha-conta' || path.startsWith('/minha-conta/') || path === '/checkout' || path.startsWith('/pedido-confirmado/');
  if (isAdmin && !isAdminLogin) {
    if (!user) return loginRedirect(request, path);
    const { data: admin, error: adminError } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
    if (adminError) { console.error('[middleware] Falha ao validar acesso administrativo.', adminError); return loginRedirect(request, path); }
    if (!admin) { await supabase.auth.signOut(); const redirect = loginRedirect(request, path, true); response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie)); return redirect; }
  }
  if (isCustomerProtected && !user) { const login = request.nextUrl.clone(); login.pathname = '/login'; login.search = ''; login.searchParams.set('next', `${path}${request.nextUrl.search}`); return NextResponse.redirect(login); }
  if (user && isAdminLogin) { const { data: admin } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle(); if (admin) { const next = request.nextUrl.searchParams.get('next'); const destination = next?.startsWith('/admin') && !next.startsWith('//') ? next : '/admin/dashboard'; return NextResponse.redirect(new URL(destination, request.url)); } }
  return response;
}

export const config = { matcher: ['/admin/:path*', '/minha-conta/:path*', '/checkout', '/pedido-confirmado/:path*'] };
