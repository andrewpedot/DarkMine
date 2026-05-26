import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase não configurado' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const id = searchParams.get('id');
    const title = searchParams.get('title');

    if (id) {
      const { data, error } = await supabase
        .from('darkmine_scripts')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        return NextResponse.json({ success: true, script: data });
      }
      console.log(`Roteiro não encontrado por ID (${id}), tentando buscar por título...`);
    }

    if (title) {
      // Try exact title match first
      const { data: exactData, error: exactError } = await supabase
        .from('darkmine_scripts')
        .select('*')
        .ilike('titulo', title)
        .limit(1);

      if (!exactError && exactData && exactData.length > 0) {
        return NextResponse.json({ success: true, script: exactData[0] });
      }

      // Try partial title match
      const { data: partialData, error: partialError } = await supabase
        .from('darkmine_scripts')
        .select('*')
        .ilike('titulo', `%${title}%`)
        .limit(1);

      if (!partialError && partialData && partialData.length > 0) {
        return NextResponse.json({ success: true, script: partialData[0] });
      }
    }

    if (id && !title) {
      return NextResponse.json({ error: 'Roteiro não encontrado' }, { status: 404 });
    }

    const { data: scripts, error } = await supabase
      .from('darkmine_scripts')
      .select('id, titulo, nicho, subnicho, wordcount, criado_em')
      .order('criado_em', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('List error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, scripts: scripts || [] });
  } catch (error: any) {
    console.error('Load error:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno' },
      { status: 500 }
    );
  }
}
