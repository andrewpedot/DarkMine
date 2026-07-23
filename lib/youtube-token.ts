import { createAdminClient } from '@/lib/supabase/admin';

export async function getValidAccessToken(channelId: string): Promise<string> {
  const supabase = createAdminClient();
  const { data: auth, error } = await supabase
    .from('channel_youtube_auth')
    .select('*')
    .eq('channel_id', channelId)
    .single();

  if (error || !auth) throw new Error('Canal não conectado ao YouTube.');

  const expiresAt = new Date(auth.expires_at).getTime();
  if (expiresAt > Date.now() + 60_000) {
    return auth.access_token;
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('GOOGLE_OAUTH_CLIENT_ID/SECRET não configurados.');

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: auth.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Falha ao renovar o token do YouTube — reconecte o canal. (${body})`);
  }

  const tokens = await resp.json();
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  await supabase
    .from('channel_youtube_auth')
    .update({ access_token: tokens.access_token, expires_at: newExpiresAt })
    .eq('channel_id', channelId);

  return tokens.access_token;
}
