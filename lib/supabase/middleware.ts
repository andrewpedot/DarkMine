import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Rotas públicas que não precisam de autenticação
  // Extensão Chrome DarkClip — liberar CORS preflight e requisições autenticadas
  const isExtension   = request.headers.get('x-extension-token') === 'darkclip-local'
                     || request.nextUrl.searchParams.get('_t') === 'darkclip-local';
  const isCORSPreflight = request.method === 'OPTIONS';

  // Responder preflight imediatamente (sem verificar auth)
  if (isCORSPreflight) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Extension-Token',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const isPublicRoute = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/auth') || request.nextUrl.pathname.startsWith('/api/debug') || isExtension;
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');

  if (!user && !isPublicRoute) {
    if (isApiRoute) {
      // Para rotas API, retorna erro 401 em vez de redirecionar
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Redireciona usuários não autenticados para a tela de login
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && request.nextUrl.pathname === '/login') {
    // Redireciona usuários autenticados que tentam acessar a tela de login para a home
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
