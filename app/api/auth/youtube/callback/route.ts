import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const channelId = request.nextUrl.searchParams.get('state');
  const oauthError = request.nextUrl.searchParams.get('error');

  if (oauthError) {
    return NextResponse.redirect(new URL(`/dashboard?youtube_error=${oauthError}`, request.url));
  }
  if (!code || !channelId) {
    return NextResponse.json({ error: 'code e state são obrigatórios' }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || `${request.nextUrl.origin}/api/auth/youtube/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET não configurados no .env.local.' },
      { status: 500 }
    );
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenResponse.ok) {
    const errorBody = await tokenResponse.text();
    return NextResponse.json({ error: `Falha ao trocar o code por tokens: ${errorBody}` }, { status: 500 });
  }

  const tokens = await tokenResponse.json();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  const supabase = createAdminClient();
  const { error } = await supabase.from('channel_youtube_auth').upsert({
    channel_id: channelId,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
    scope: tokens.scope,
  });

  if (error) {
    return NextResponse.json({ error: `Falha ao salvar tokens: ${error.message}` }, { status: 500 });
  }

  return NextResponse.redirect(new URL(`/dashboard?channel=${channelId}&youtube_connected=1`, request.url));
}
