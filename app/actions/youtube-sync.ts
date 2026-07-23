'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getValidAccessToken } from '@/lib/youtube-token';
import { revalidatePath } from 'next/cache';

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

async function queryTrafficSources(accessToken: string, startDate: string, endDate: string, videoIds: string) {
  const url = new URL('https://youtubeanalytics.googleapis.com/v2/reports');
  url.searchParams.set('ids', 'channel==MINE');
  url.searchParams.set('startDate', startDate);
  url.searchParams.set('endDate', endDate);
  url.searchParams.set('metrics', 'views');
  url.searchParams.set('dimensions', 'video,insightTrafficSourceType');
  url.searchParams.set('filters', `video==${videoIds}`);
  return fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
}

function aggregateTrafficSources(json: any): Map<string, { search: number; suggested: number; other: number }> {
  const headers: string[] = (json.columnHeaders || []).map((h: any) => h.name);
  const videoIdx = headers.indexOf('video');
  const sourceIdx = headers.indexOf('insightTrafficSourceType');
  const viewsIdx = headers.indexOf('views');
  const map = new Map<string, { search: number; suggested: number; other: number }>();
  for (const row of json.rows || []) {
    const videoId = row[videoIdx];
    const source = row[sourceIdx];
    const views = Number(row[viewsIdx] ?? 0);
    const entry = map.get(videoId) ?? { search: 0, suggested: 0, other: 0 };
    // Soma TODAS as linhas (não só busca/sugeridos) para que os percentuais no Dashboard
    // sejam calculados sobre o total real de views — do contrário ficam inflados frente
    // ao YouTube Studio, que reparte 100% entre todas as fontes (inclusive externo,
    // notificações, playlists, páginas do canal etc).
    if (source === 'YT_SEARCH') entry.search += views;
    else if (source === 'SUGGESTED_VIDEO' || source === 'BROWSE_FEATURES') entry.suggested += views;
    else entry.other += views;
    map.set(videoId, entry);
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

  // CTR/impressões de miniatura NÃO existem na Analytics API interativa (a combinação
  // sempre retorna "query not supported") — esses dados vêm do pipeline assíncrono da
  // Reporting API (ver app/actions/youtube-reporting.ts), que grava direto em
  // scheduled_videos.thumbnail_ctr/thumbnail_impressions.

  // Inscritos ganhos — chamada isolada por precaução, já que combinações de métricas
  // podem pertencer a grupos diferentes na Analytics API (mesmo padrão do CTR acima).
  let subsData = new Map<string, Record<string, number>>();
  const subsResp = await queryAnalytics(accessToken, startDate, today, videoIds, 'subscribersGained');
  if (subsResp.ok) {
    subsData = rowsToMap(await subsResp.json());
  } else {
    console.warn('[youtube-sync] subscribersGained indisponível:', await subsResp.text());
  }

  // Fontes de tráfego (busca vs. sugeridos/navegação) — dimensão extra, então usa parsing próprio.
  let trafficData = new Map<string, { search: number; suggested: number; other: number }>();
  const trafficResp = await queryTrafficSources(accessToken, startDate, today, videoIds);
  if (trafficResp.ok) {
    trafficData = aggregateTrafficSources(await trafficResp.json());
  } else {
    console.warn('[youtube-sync] fontes de tráfego indisponíveis:', await trafficResp.text());
  }

  const now = new Date();
  const metricsToInsert = videos
    .filter((v) => baseData.has(v.youtube_video_id!))
    .map((video) => {
      const base = baseData.get(video.youtube_video_id!)!;
      const subs = subsData.get(video.youtube_video_id!);
      const traffic = trafficData.get(video.youtube_video_id!);
      const daysSincePublished = video.published_at
        ? Math.floor((now.getTime() - new Date(video.published_at).getTime()) / 86_400_000)
        : null;
      return {
        scheduled_video_id: video.id,
        days_since_published: daysSincePublished,
        views: base.views ?? 0,
        watch_time_minutes: base.estimatedMinutesWatched ?? 0,
        avg_view_duration_sec: base.averageViewDuration ?? 0,
        likes: base.likes ?? 0,
        comments: base.comments ?? 0,
        subscribers_gained: subs?.subscribersGained ?? null,
        traffic_search_views: traffic?.search ?? null,
        traffic_suggested_views: traffic?.suggested ?? null,
        traffic_other_views: traffic?.other ?? null,
      };
    });

  if (metricsToInsert.length > 0) {
    const { error: insertError } = await supabase.from('video_metrics').insert(metricsToInsert);
    if (insertError) throw new Error(insertError.message);
  }

  revalidatePath('/dashboard');
  return { synced: metricsToInsert.length };
}
