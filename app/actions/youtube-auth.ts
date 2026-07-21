'use server';

import { createAdminClient } from '@/lib/supabase/admin';

export async function getChannelAuthStatus(channelId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('channel_youtube_auth')
    .select('channel_id')
    .eq('channel_id', channelId)
    .maybeSingle();
  return !!data;
}

export async function disconnectChannel(channelId: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from('channel_youtube_auth').delete().eq('channel_id', channelId);
}
