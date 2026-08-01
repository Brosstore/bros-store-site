import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isAdminLoginPage = path === '/admin/login';
  const isCustomerLoginPage = path === '/login';
  const isProtectedArea = path.startsWith('/admin/') || path === '/minha-conta';

  if (!user && isProtectedArea && !isAdminLoginPage) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = path.startsWith('/admin/') ? '/admin/login' : '/login';
    loginUrl.searchParams.set('redirected', '1');
    return NextResponse.redirect(loginUrl);
  }

  if (user && isAdminLoginPage) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = '/admin/dashboard';
    dashboardUrl.search = '';
    return NextResponse.redirect(dashboardUrl);
  }

  if (user && isCustomerLoginPage) {
    const accountUrl = request.nextUrl.clone();
    accountUrl.pathname = '/minha-conta';
    accountUrl.search = '';
    return NextResponse.redirect(accountUrl);
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/minha-conta', '/login'],
};
