'use server';

import { createClient } from '@/lib/supabase/server';
import type { VideoMetric } from '@/types/database';

/** Retorna a métrica mais recente de cada vídeo publicado do canal. */
export async function listLatestMetricsByChannel(channelId: string): Promise<VideoMetric[]> {
  const supabase = await createClient();

  const { data: videos } = await supabase
    .from('scheduled_videos')
    .select('id')
    .eq('channel_id', channelId)
    .eq('status', 'publicado');

  const videoIds = (videos ?? []).map((v) => v.id);
  if (videoIds.length === 0) return [];

  const { data: metrics, error } = await supabase
    .from('video_metrics')
    .select('*')
    .in('scheduled_video_id', videoIds)
    .order('synced_at', { ascending: false });

  if (error) throw new Error(error.message);

  const latestByVideo = new Map<string, VideoMetric>();
  (metrics ?? []).forEach((m) => {
    if (!latestByVideo.has(m.scheduled_video_id)) latestByVideo.set(m.scheduled_video_id, m as VideoMetric);
  });
  return Array.from(latestByVideo.values());
}

/**
 * Retorna, por vídeo publicado do canal, a métrica cujo `days_since_published` está
 * mais próximo de `targetDays` (comparação D1/D3/D7). Se `targetDays` for null, retorna
 * a mais recente de cada vídeo (mesmo comportamento de `listLatestMetricsByChannel`).
 */
export async function listMetricsAtAge(channelId: string, targetDays: number | null): Promise<VideoMetric[]> {
  if (targetDays === null) return listLatestMetricsByChannel(channelId);

  const supabase = await createClient();

  const { data: videos } = await supabase
    .from('scheduled_videos')
    .select('id')
    .eq('channel_id', channelId)
    .eq('status', 'publicado');

  const videoIds = (videos ?? []).map((v) => v.id);
  if (videoIds.length === 0) return [];

  const { data: metrics, error } = await supabase
    .from('video_metrics')
    .select('*')
    .in('scheduled_video_id', videoIds)
    .not('days_since_published', 'is', null);

  if (error) throw new Error(error.message);

  const closestByVideo = new Map<string, VideoMetric>();
  (metrics ?? []).forEach((m) => {
    const current = closestByVideo.get(m.scheduled_video_id);
    const diff = Math.abs((m.days_since_published ?? 0) - targetDays);
    const currentDiff = current ? Math.abs((current.days_since_published ?? 0) - targetDays) : Infinity;
    if (!current || diff < currentDiff) closestByVideo.set(m.scheduled_video_id, m as VideoMetric);
  });
  return Array.from(closestByVideo.values());
}

/** Histórico completo de sincronizações de um vídeo, do mais antigo ao mais recente. */
export async function listMetricsHistory(scheduledVideoId: string): Promise<VideoMetric[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('video_metrics')
    .select('*')
    .eq('scheduled_video_id', scheduledVideoId)
    .order('synced_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data as VideoMetric[];
}
