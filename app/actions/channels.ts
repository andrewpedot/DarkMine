'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Channel, ChannelTipo, RecurrenceType } from '@/types/database';

const CHANNEL_COLORS = ['#8b5cf6', '#22d3ee', '#34d399', '#f59e0b', '#f472b6', '#60a5fa', '#f87171', '#a3e635'];

export async function listChannels(): Promise<Channel[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('channels')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data as Channel[];
}

export async function createChannel(input: {
  channel_code: string;
  name: string;
  youtube_url: string;
  tipo: ChannelTipo;
  recurrence_type: RecurrenceType;
  recurrence_days: number[];
  publish_start_date: string;
}): Promise<Channel> {
  const supabase = await createClient();

  const { count } = await supabase.from('channels').select('id', { count: 'exact', head: true });
  const color = CHANNEL_COLORS[(count ?? 0) % CHANNEL_COLORS.length];

  const { data, error } = await supabase
    .from('channels')
    .insert({
      channel_code: input.channel_code,
      name: input.name,
      niche: '',
      language: 'pt',
      status: 'ativo',
      youtube_url: input.youtube_url,
      tipo: input.tipo,
      recurrence_type: input.recurrence_type,
      recurrence_days: input.recurrence_type === 'custom' ? input.recurrence_days : null,
      publish_start_date: input.publish_start_date,
      color,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath('/workflow');
  return data as Channel;
}

export async function updateChannel(
  id: string,
  input: {
    channel_code: string;
    name: string;
    youtube_url: string;
    tipo: ChannelTipo;
    recurrence_type: RecurrenceType;
    recurrence_days: number[];
    publish_start_date: string;
    status: Channel['status'];
  }
): Promise<Channel> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('channels')
    .update({
      channel_code: input.channel_code,
      name: input.name,
      youtube_url: input.youtube_url,
      tipo: input.tipo,
      recurrence_type: input.recurrence_type,
      recurrence_days: input.recurrence_type === 'custom' ? input.recurrence_days : null,
      publish_start_date: input.publish_start_date,
      status: input.status,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath('/workflow');
  return data as Channel;
}

export async function deleteChannel(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('channels').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/workflow');
}
