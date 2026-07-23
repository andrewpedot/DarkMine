'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

async function getValidAccessToken(channelId: string): Promise<string> {
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

async function queryAnalytics(accessToken: string, startDate: string, endDate: string, videoIds: string, metrics: string) {
  const url = new URL('https://youtubeanalytics.googleapis.com/v2/reports');
  url.searchParams.set('ids', 'channel==MINE');
  url.searchParams.set('startDate', startDate);
  url.searchParams.set('endDate', endDate);
  url.searchParams.set('metrics', metrics);
  url.searchParams.set('dimensions', 'video');
  url.searchParams.set('filters', `video==${videoIds}`);

  return fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
}

function rowsToMap(json: any): Map<string, Record<string, number>> {
  const headers: string[] = (json.columnHeaders || []).map((h: any) => h.name);
  const map = new Map<string, Record<string, number>>();
  for (const row of json.rows || []) {
    const record: Record<string, number> = {};
    headers.forEach((h: string, i: number) => {
      if (h !== 'video') record[h] = Number(row[i] ?? 0);
    });
    map.set(row[headers.indexOf('video')], record);
  }
  return map;
}

export async function syncChannelMetrics(channelId: string): Promise<{ synced: number }> {
  const supabase = createAdminClient();
  const accessToken = await getValidAccessToken(channelId);

  const { data: videos, error } = await supabase
    .from('scheduled_videos')
    .select('id, youtube_video_id, published_at')
    .eq('channel_id', channelId)
    .eq('status', 'publicado')
    .not('youtube_video_id', 'is', null);

  if (error) throw new Error(error.message);
  if (!videos || videos.length === 0) return { synced: 0 };

  const today = new Date().toISOString().slice(0, 10);
  // Usa uma data bem antiga como início da janela — `published_at` reflete quando o vídeo
  // foi marcado como Publicado no app, não a data real de upload no YouTube, então não é
  // confiável como limite inferior da consulta de estatísticas acumuladas.
  const startDate = '2005-01-01';
  const videoIds = videos.map((v) => v.youtube_video_id).join(',');

  const resp = await queryAnalytics(accessToken, startDate, today, videoIds, 'views,estimatedMinutesWatched,averageViewDuration,likes,comments');

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Falha ao consultar a YouTube Analytics API: ${body}`);
  }

  const baseData = rowsToMap(await resp.json());

  // Impressões/CTR de miniatura usam nomes de metric próprios (adicionados pelo Google em
  // jan/2026) e pertencem a um grupo separado das métricas básicas — por isso vão numa
  // chamada isolada, e se ainda assim falharem (conta sem acesso a esse relatório), seguimos
  // sem CTR em vez de derrubar a sincronização inteira.
  let ctrData = new Map<string, Record<string, number>>();
  const ctrResp = await queryAnalytics(accessToken, startDate, today, videoIds, 'videoThumbnailImpressions,videoThumbnailImpressionsClickRate');
  if (ctrResp.ok) {
    ctrData = rowsToMap(await ctrResp.json());
  } else {
    console.warn('[youtube-sync] impressões/CTR indisponíveis:', await ctrResp.text());
  }

  const now = new Date();
  const metricsToInsert = videos
    .filter((v) => baseData.has(v.youtube_video_id!))
    .map((video) => {
      const base = baseData.get(video.youtube_video_id!)!;
      const ctr = ctrData.get(video.youtube_video_id!);
      const daysSincePublished = video.published_at
        ? Math.floor((now.getTime() - new Date(video.published_at).getTime()) / 86_400_000)
        : null;
      const ctrFraction = ctr?.videoThumbnailImpressionsClickRate;
      return {
        scheduled_video_id: video.id,
        days_since_published: daysSincePublished,
        views: base.views ?? 0,
        watch_time_minutes: base.estimatedMinutesWatched ?? 0,
        avg_view_duration_sec: base.averageViewDuration ?? 0,
        likes: base.likes ?? 0,
        comments: base.comments ?? 0,
        impressions: ctr?.videoThumbnailImpressions ?? null,
        ctr: ctrFraction !== undefined ? Number((ctrFraction * 100).toFixed(2)) : null,
      };
    });

  if (metricsToInsert.length > 0) {
    const { error: insertError } = await supabase.from('video_metrics').insert(metricsToInsert);
    if (insertError) throw new Error(insertError.message);
  }

  revalidatePath('/dashboard');
  return { synced: metricsToInsert.length };
}
