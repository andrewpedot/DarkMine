import { createClient } from '../../../../../../lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; characterId: string }> }
) {
  const { id: channelId, characterId } = await params;
  const supabase = await createClient();

  const formData = await request.formData();
  const name = formData.get('name') as string;
  const file = formData.get('image') as File | null;

  const updates: Record<string, string> = {};
  if (name) updates.name = name;

  if (file && file.size > 0) {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${channelId}/${characterId}_${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from('character-images')
      .upload(path, buffer, { contentType: file.type, upsert: true });

    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('character-images').getPublicUrl(path);
      updates.image_url = urlData.publicUrl;
    }
  }

  const { data, error } = await supabase
    .from('channel_characters')
    .update(updates)
    .eq('id', characterId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ character: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; characterId: string }> }
) {
  const { id: channelId, characterId } = await params;
  const supabase = await createClient();

  const { data: char } = await supabase
    .from('channel_characters')
    .select('image_url')
    .eq('id', characterId)
    .single();

  if (char?.image_url) {
    const url = char.image_url as string;
    const idx = url.indexOf('character-images/');
    if (idx !== -1) {
      const path = url.slice(idx + 'character-images/'.length);
      await supabase.storage.from('character-images').remove([path]);
    }
  }

  const { error } = await supabase.from('channel_characters').delete().eq('id', characterId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
