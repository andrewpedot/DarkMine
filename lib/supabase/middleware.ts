import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  // Login desativado em desenvolvimento local para agilizar testes manuais.
  // Em produção (Netlify) o gate de auth continua ativo normalmente.
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.next({ request });
  }

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

  // Extensão Chrome DarkClip — libera SOMENTE as duas rotas que ela de fato chama (clip e
  // download), nunca /api/media/search (usada pela página Dark Mídia, protegida por login
  // normal) nem o app inteiro. Token vem de env var (não hardcoded) para não ficar público
  // no histórico do Git.
  const isExtensionRoute = request.nextUrl.pathname === '/api/media/clip' || request.nextUrl.pathname === '/api/media/download';
  const extensionToken = process.env.DARKCLIP_EXTENSION_TOKEN;
  const isExtension = isExtensionRoute && !!extensionToken && (
    request.headers.get('x-extension-token') === extensionToken
    || request.nextUrl.searchParams.get('_t') === extensionToken
  );
  const isCORSPreflight = request.method === 'OPTIONS';

  // Responder preflight imediatamente (sem verificar auth) — só para as rotas de mídia da extensão
  if (isCORSPreflight && isExtensionRoute) {
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

  const isPublicRoute = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/auth') || request.nextUrl.pathname.startsWith('/api/mcp') || isExtension;
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
