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
