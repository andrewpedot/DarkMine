'use server';

import { supabase } from '@/lib/supabase';

export async function sendToProduction(resultId: string) {
  if (!supabase) return { success: false, error: 'Supabase not configured' };

  try {
    // 1. Fetch the analysis result with video and channel info
    const { data: result, error: fetchError } = await supabase
      .from('analysis_results')
      .select(`
        *,
        videos (*),
        channels (*)
      `)
      .eq('id', resultId)
      .single();

    if (fetchError || !result) {
      return { success: false, error: 'Result not found' };
    }

    // 2. Create a new project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        original_title: result.videos.title,
        channel_name: result.channels.name,
        channel_url: `https://www.youtube.com/channel/${result.channels.id}`,
        search_session_id: result.session_id,
        status: 'pending'
      })
      .select()
      .single();

    if (projectError) {
      return { success: false, error: projectError.message };
    }

    return { success: true, projectId: project.id };
  } catch (error: any) {
    console.error('Send to production error:', error);
    return { success: false, error: error.message };
  }
}
