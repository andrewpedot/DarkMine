import { createClient } from '../../../../../lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('channel_characters')
    .select('*')
    .eq('channel_id', id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ characters: data });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: channelId } = await params;
  const supabase = await createClient();

  const formData = await request.formData();
  const name = formData.get('name') as string;
  const file = formData.get('image') as File | null;

  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  // Create the character record first to get its ID
  const { data: char, error: insertError } = await supabase
    .from('channel_characters')
    .insert({ channel_id: channelId, name })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  let image_url: string | null = null;

  if (file && file.size > 0) {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${channelId}/${char.id}_${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from('character-images')
      .upload(path, buffer, { contentType: file.type, upsert: true });

    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('character-images').getPublicUrl(path);
      image_url = urlData.publicUrl;

      await supabase
        .from('channel_characters')
        .update({ image_url })
        .eq('id', char.id);
    }
  }

  return NextResponse.json({ character: { ...char, image_url } }, { status: 201 });
}
