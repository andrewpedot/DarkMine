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

    if (id) {
      const { data, error } = await supabase
        .from('darkmine_scripts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Load error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, script: data });
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
