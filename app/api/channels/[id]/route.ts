import { createClient } from '../../../../lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('channels')
    .select('*, characters:channel_characters(*)')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ channel: data });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from('channels')
    .update({
      name: body.name,
      niche: body.niche,
      sub_niche: body.sub_niche ?? null,
      persona: body.persona ?? null,
      video_format: body.video_format ?? null,
      language: body.language,
      status: body.status,
      ref_titles: body.ref_titles ?? null,
      ref_transcripts: body.ref_transcripts ?? [],
      ref_scripts: body.ref_scripts ?? [],
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ channel: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Remove character images from storage
  const { data: chars } = await supabase
    .from('channel_characters')
    .select('id, image_url')
    .eq('channel_id', id);

  if (chars && chars.length > 0) {
    const paths = chars
      .filter(c => c.image_url)
      .map(c => {
        const url = c.image_url as string;
        const idx = url.indexOf('character-images/');
        return idx !== -1 ? url.slice(idx + 'character-images/'.length) : null;
      })
      .filter(Boolean) as string[];

    if (paths.length > 0) {
      await supabase.storage.from('character-images').remove(paths);
    }
  }

  const { error } = await supabase.from('channels').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
