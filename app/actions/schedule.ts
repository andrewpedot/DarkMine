'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ScheduledVideo, VideoPipelineStatus } from '@/types/database';

export async function listScheduledVideos(channelId?: string): Promise<ScheduledVideo[]> {
  const supabase = await createClient();
  let query = supabase.from('scheduled_videos').select('*').order('scheduled_date', { ascending: true });
  if (channelId) query = query.eq('channel_id', channelId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as ScheduledVideo[];
}

export async function createScheduledVideos(
  channelId: string,
  entries: { title: string; date: string }[]
): Promise<ScheduledVideo[]> {
  const supabase = await createClient();

  const rows = entries.map((entry, i) => ({
    channel_id: channelId,
    sequence_number: i + 1,
    title: entry.title,
    scheduled_date: entry.date,
    status: 'em_producao' as VideoPipelineStatus,
  }));

  const { data, error } = await supabase.from('scheduled_videos').insert(rows).select();
  if (error) throw new Error(error.message);
  revalidatePath('/workflow');
  return data as ScheduledVideo[];
}

export async function addScheduledVideo(input: {
  channel_id: string;
  title: string;
  scheduled_date: string;
}): Promise<ScheduledVideo> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('scheduled_videos')
    .select('sequence_number')
    .eq('channel_id', input.channel_id)
    .order('sequence_number', { ascending: false })
    .limit(1);

  const nextSeq = existing && existing.length > 0 ? existing[0].sequence_number + 1 : 1;

  const { data, error } = await supabase
    .from('scheduled_videos')
    .insert({
      channel_id: input.channel_id,
      sequence_number: nextSeq,
      title: input.title,
      scheduled_date: input.scheduled_date,
      status: 'em_producao',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath('/workflow');
  return data as ScheduledVideo;
}

export async function updateScheduledVideo(
  id: string,
  updates: Partial<Pick<ScheduledVideo, 'title' | 'scheduled_date' | 'status' | 'youtube_video_id' | 'published_at'>>
): Promise<ScheduledVideo> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('scheduled_videos')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath('/workflow');
  return data as ScheduledVideo;
}

export async function deleteScheduledVideo(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('scheduled_videos').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/workflow');
}
