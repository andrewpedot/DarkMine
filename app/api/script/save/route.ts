import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase não configurado' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { titulo, nicho, subnicho, contexto, wordcount, conteudo, conteudo_raw, id } = body;

    if (!titulo) {
      return NextResponse.json(
        { error: 'Título é obrigatório' },
        { status: 400 }
      );
    }

    const scriptData = {
      titulo,
      nicho: nicho || '',
      subnicho: subnicho || '',
      contexto: contexto || '',
      wordcount: wordcount || 3000,
      conteudo: conteudo || {},
      conteudo_raw: conteudo_raw || '',
      atualizado_em: new Date().toISOString(),
    };

    let result;

    if (id) {
      const { data, error } = await supabase
        .from('darkmine_scripts')
        .update(scriptData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Update error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      result = data;
    } else {
      const { data, error } = await supabase
        .from('darkmine_scripts')
        .insert({
          ...scriptData,
          criado_em: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Insert error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      result = data;
    }

    console.log('Script salvo:', result.id);
    return NextResponse.json({ success: true, script: result }, { status: 201 });
  } catch (error: any) {
    console.error('Save error:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno' },
      { status: 500 }
    );
  }
}
