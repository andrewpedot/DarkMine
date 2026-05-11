import { createClient } from '../../../lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('channels')
    .select('*, characters:channel_characters(*)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ channels: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from('channels')
    .insert({
      name: body.name,
      niche: body.niche,
      sub_niche: body.sub_niche || null,
      persona: body.persona || null,
      video_format: body.video_format || null,
      language: body.language || 'pt',
      status: body.status || 'ativo',
      ref_titles: body.ref_titles || null,
      ref_transcripts: body.ref_transcripts || [],
      ref_scripts: body.ref_scripts || [],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ channel: data }, { status: 201 });
}
