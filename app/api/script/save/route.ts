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
    const {
      titulo,
      nicho,
      subnicho,
      contexto,
      wordcount,
      conteudo,
      conteudo_raw,
      id,
      publico_alvo,
      idioma_narracao,
      cultura_alvo,
    } = body;

    if (!titulo) {
      return NextResponse.json(
        { error: 'Título é obrigatório' },
        { status: 400 }
      );
    }

    // Bundling new parameters into conteudo JSON as fallback and backwards compatibility
    const extendedConteudo = {
      ...(conteudo || {}),
      publico_alvo: publico_alvo || '',
      idioma_narracao: idioma_narracao || 'Português',
      cultura_alvo: cultura_alvo || 'Brasil',
    };

    const scriptData = {
      titulo,
      nicho: nicho || '',
      subnicho: subnicho || '',
      contexto: contexto || '',
      wordcount: wordcount || 3000,
      conteudo: extendedConteudo,
      conteudo_raw: conteudo_raw || '',
      atualizado_em: new Date().toISOString(),
      // Write to new columns directly (fallback if migration is not run)
      publico_alvo: publico_alvo || '',
      idioma_narracao: idioma_narracao || 'Português',
      cultura_alvo: cultura_alvo || 'Brasil',
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
        console.error('Update error, attempting fallback without new columns...', error);
        // Fallback: If new columns do not exist in the table yet, remove them and save only to JSON
        const { publico_alvo, idioma_narracao, cultura_alvo, ...fallbackData } = scriptData;
        const { data: fbData, error: fbError } = await supabase
          .from('darkmine_scripts')
          .update(fallbackData)
          .eq('id', id)
          .select()
          .single();

        if (fbError) {
          console.error('Fallback update error:', fbError);
          return NextResponse.json({ error: fbError.message }, { status: 500 });
        }
        result = fbData;
      } else {
        result = data;
      }
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
        console.error('Insert error, attempting fallback without new columns...', error);
        // Fallback: If new columns do not exist in the table yet, remove them and save only to JSON
        const { publico_alvo, idioma_narracao, cultura_alvo, ...fallbackData } = scriptData;
        const { data: fbData, error: fbError } = await supabase
          .from('darkmine_scripts')
          .insert({
            ...fallbackData,
            criado_em: new Date().toISOString(),
          })
          .select()
          .single();

        if (fbError) {
          console.error('Fallback insert error:', fbError);
          return NextResponse.json({ error: fbError.message }, { status: 500 });
        }
        result = fbData;
      } else {
        result = data;
      }
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
