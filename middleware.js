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
  const isLoginPage = request.nextUrl.pathname === '/admin/login';

  if (!user && !isLoginPage) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/admin/login';
    loginUrl.searchParams.set('redirected', '1');
    return NextResponse.redirect(loginUrl);
  }

  if (user && isLoginPage) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = '/admin/dashboard';
    dashboardUrl.search = '';
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
