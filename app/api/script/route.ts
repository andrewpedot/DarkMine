import fs from 'fs';
import path from 'path';
// @ts-ignore
import pdfParse from 'pdf-parse';

export const maxDuration = 300;

function detectLanguage(text: string): string {
  const ptPatterns = /[áéíóúàèìòùâêîôûãõñç]/i;
  const enPatterns = /\b(the|is|are|was|were|and|or|but|to|in|on|at|for|with|from|this|that|these|those|a|an|of|it|its|be|have|has|had|will|would|could|should|may|might|must|shall|can)\b/i;
  const ptMatches = (text.match(ptPatterns) || []).length;
  const enMatches = (text.match(enPatterns) || []).length;
  return ptMatches >= enMatches ? 'pt' : 'en';
}

const SYSTEM_PROMPT = `Você é um Estrategista de YouTube de elite e um Roteirista Master de Copywriting Direto, especialista em criar roteiros virais e persuasivos baseados em neuromarketing.`;

function buildRefTranscriptsBlock(refTranscripts?: { title: string; transcript: string }[]): string {
  if (!refTranscripts || refTranscripts.length === 0) return '';
  return `\n---REFERÊNCIAS DE TRANSCRIÇÃO---\n${refTranscripts.map((t, i) => `REFERÊNCIA ${i + 1}: "${t.title}"\n${t.transcript}`).join('\n---\n')}\n---FIM DAS REFERÊNCIAS---`;
}

function buildPrompt({
  contexto_canal,
  nicho,
  subnicho,
  publico_alvo,
  nivel_consciencia,
  inimigo_comum,
  emocao_primaria,
  tom_de_voz,
  titulo_video,
  idioma_narracao,
  cultura_alvo,
  palavras_por_bloco,
  quantidade_blocos,
  ref_transcripts,
  pdf_reference_text,
}: {
  contexto_canal: string;
  nicho: string;
  subnicho: string;
  publico_alvo: string;
  nivel_consciencia: number | string;
  inimigo_comum: string;
  emocao_primaria: string;
  tom_de_voz: string;
  titulo_video: string;
  idioma_narracao: string;
  cultura_alvo: string;
  palavras_por_bloco: number;
  quantidade_blocos: number;
  ref_transcripts?: { title: string; transcript: string }[];
  pdf_reference_text?: string;
}) {
  const refTranscriptsBlock = buildRefTranscriptsBlock(ref_transcripts);
  const pdfBlock = pdf_reference_text
    ? `\n---REFERÊNCIAS DE DOCUMENTO PDF ANEXADO (ESTUDE E APLIQUE ESSAS DIRETRIZES DE ROTEIRO, TÍTULOS E IMAGEM)---\n${pdf_reference_text}\n---FIM DAS REFERÊNCIAS PDF ANEXADO---\n`
    : '';

  return `Você é um Estrategista de YouTube de elite e um Roteirista Master de Copywriting Direto, especialista em criar roteiros virais e persuasivos. Sua habilidade única é clonar o ritmo de conteúdos de sucesso, garantir precisão lógica (sem inventar falsos oceanos azuis) e aplicar engenharia de neuromarketing focada puramente na força das palavras.

## 1. DADOS DE ENTRADA
- Canal / Contexto da Persona: ${contexto_canal}
- Nicho: ${nicho}
- Subnicho: ${subnicho || 'Não especificado'}
- Público-Alvo: ${publico_alvo}
- Nível de Consciência (1 a 5): ${nivel_consciencia}
- Inimigo Comum do Nicho: ${inimigo_comum}
- Emoção Primária Exigida: ${emocao_primaria}
- Tom de Voz: ${tom_de_voz}
- Título do Vídeo: ${titulo_video}
- Idioma da Narração: ${idioma_narracao}
- País/Cultura Alvo: ${cultura_alvo}
- Meta de Palavras por Bloco: ${palavras_por_bloco}
- Quantidade Total de Blocos: ${quantidade_blocos}
${pdfBlock}
## 2. TRANSCRIÇÕES DE REFERÊNCIA (O RITMO)
${refTranscriptsBlock || 'Nenhuma transcrição de referência fornecida.'}
**Regra de Clonagem:** Mimetize estritamente o RITMO, a estrutura de ganchos e a cadência destas referências. Extraia apenas a engenharia da atenção, não o conteúdo.

## 3. LOCALIZAÇÃO CULTURAL
Pense e escreva DIRETAMENTE como um nativo de: ${cultura_alvo}.
- Use expressões e nomenclaturas oficiais consagradas neste país e idioma.
- A narrativa deve soar 100% orgânica para as dores e tradições locais.

## 4. ENGENHARIA DE ROTEIRO E NEUROMARKETING
1. ATAQUE O CÉREBRO LÍMBICO: O início deve ser puramente emocional. Não use estatísticas complexas de cara. Faça a audiência sentir ${emocao_primaria} intensamente. A lógica entra depois para justificar.
2. O GANCHO DE 5 SEGUNDOS E O INIMIGO COMUM: Nos primeiros 10 segundos, valide a promessa do ${titulo_video} unindo-se ao público contra o ${inimigo_comum}. Gere empatia imediata. Zero enrolação.
3. O MECANISMO ÚNICO (OPEN LOOP): A solução não pode ser "mais do mesmo". Estruture a revelação central como um caminho novo. Abra esse mistério no Bloco 1 e entregue a resposta no último bloco.
4. MICRO-GANCHOS: A ÚLTIMA frase de CADA bloco deve ser um cliffhanger, forçando o espectador a querer ouvir o próximo bloco.
5. IMAGENS MENTAIS: Como não haverá direcionamento visual, suas palavras devem ser altamente descritivas. Pinte o cenário, a dor e a situação na mente do espectador.

## 5. ANÁLISE PRÉVIA E BLINDAGEM LÓGICA
Gere o bloco [ANÁLISE ESTRATÉGICA]. Responda em 5 frases curtas (em Português):
1. Auditoria Lógica: A premissa central é factualmente precisa e logicamente sólida para o ${subnicho || nicho}? (Elimine falhas lógicas e oportunidades irreais).
2. Adequação: Como a linguagem atingirá cirurgicamente o Nível de Consciência: ${nivel_consciencia}?
3. Emoção: Como o roteiro sustentará EXCLUSIVAMENTE a emoção de ${emocao_primaria}?
4. Conexão: Qual nuance de ${cultura_alvo} atacará o ${inimigo_comum}?
5. Transição: Qual é o Micro-Gancho exato entre o Bloco 1 e o Bloco 2?

## 6. FORMATO DE SAÍDA ESTRITO
Não adicione textos explicativos fora destes blocos.

[ANÁLISE ESTRATÉGICA]
(Sua análise de 5 pontos)

---
[BLOCO: 1 | Introdução e Gancho]
[NARRAÇÃO]
(Texto nativo em ${idioma_narracao}. Frase final atua como Micro-Gancho. Tamanho rigoroso: ~${palavras_por_bloco} palavras.)

---
[BLOCO: 2 | Título do Bloco]
[NARRAÇÃO]
(Texto nativo em ${idioma_narracao}. Continuação fluida.)

---
(Continue gerando blocos até atingir a quantidade de ${quantidade_blocos} blocos)

[THUMBNAIL_PROMPT]
(Gere um prompt em Inglês para a miniatura seguindo estes padrões validados de YouTube:
- Contraste extremo (Cores complementares ou objeto saturado em fundo escuro).
- Foco em transmitir a ${emocao_primaria} (Medo extremo ou Ganância/Desejo).
- Elemento principal grande e isolado (Ocupando 40% da tela).
- Sugestão de texto na imagem: Máximo de 3 palavras de alto impacto, fáceis de ler no celular, em fonte grossa.
- Gatilho visual: Um detalhe incongruente ou uma seta/círculo vermelho sutil que gere curiosidade instantânea.)`;
}

function parseScript(text: string): { analise_estrategica: string; cenas: any[]; thumbnail_prompt: string } {
  // 1. Extract Análise Estratégica
  const analiseMatch = text.match(/\[AN[ÁA]LISE\s+ESTRAT[ÉE]GICA\]([\s\S]*?)(?=\-\-\-|\[BLOCO|$)/i);
  const analise_estrategica = analiseMatch ? analiseMatch[1].trim() : '';

  // 2. Extract Thumbnail Prompt
  const thumbMatch = text.match(/\[(?:THUMBNAIL_PROMPT|PROMPT_DA_MINIATURA|MINIATURA_PROMPT|PROMPT_THUMBNAIL|THUMBNAIL)\]([\s\S]*?)$/i);
  const thumbnail_prompt = thumbMatch ? thumbMatch[1].trim() : '';

  // Remove thumbnail prompt from text to avoid matching it in last block
  const mainText = thumbMatch ? text.slice(0, thumbMatch.index) : text;

  // 3. Extract blocks using a flexible regex to accommodate format shifts (missing pipes, different block spellings)
  const cenas: any[] = [];
  const blockRegex = /\[(?:BLOCO|BLOCK|BLOK|BLOC|SECCION|SECCIÓN)\s*:?\s*(\d+)\s*(?:[:|-])?\s*([^\]]*)\]/gi;
  let match;
  const matches: { index: number; id: number; title: string }[] = [];
  
  while ((match = blockRegex.exec(mainText)) !== null) {
    matches.push({
      index: match.index,
      id: parseInt(match[1]),
      title: match[2].trim() || `Parte ${match[1]}`
    });
  }

  for (let i = 0; i < matches.length; i++) {
    const startIdx = matches[i].index;
    const endIdx = i + 1 < matches.length ? matches[i + 1].index : mainText.length;
    const blockContent = mainText.substring(startIdx, endIdx);

    let narracao = '';
    // Match common variations of [NARRAÇÃO] in different languages
    const narracaoMatch = blockContent.match(/\[(?:NARRA[ÇC][ÃA]O|NARRAC[JÓ]A|NARRATION|NARRACI[ÓÓ]N|NARRA[ÇC]AO|NARRACAO)\]([\s\S]*?)$/i);
    
    if (narracaoMatch) {
      narracao = narracaoMatch[1].trim();
    } else {
      // Fallback: strip the [BLOCO: ...] header line and take all remaining text
      const bracketIdx = blockContent.indexOf(']');
      if (bracketIdx !== -1) {
        narracao = blockContent.substring(bracketIdx + 1).trim();
      } else {
        narracao = blockContent.trim();
      }
    }

    // Clean up trailing dashes/dividers
    narracao = narracao.replace(/\s*\-\-\-\s*$/, '').trim();

    cenas.push({
      id: matches[i].id,
      titulo_cena: matches[i].title,
      narracao: narracao
    });
  }

  return {
    analise_estrategica,
    cenas,
    thumbnail_prompt
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      niche,
      subniche,
      context,
      publico_alvo,
      idioma_narracao,
      cultura_alvo,
      wordCount,
      reference_pdf,
      ref_transcripts,
      // Neuromarketing parameters
      nivel_consciencia,
      inimigo_comum,
      emocao_primaria,
      tom_de_voz,
      quantidade_blocos,
      palavras_por_bloco,
    } = body;

    const lang = detectLanguage(title);

    let pdfReferenceText = '';
    if (reference_pdf) {
      try {
        if (reference_pdf.startsWith('{')) {
          const parsed = JSON.parse(reference_pdf);
          pdfReferenceText = parsed.text || '';
          console.log(`Successfully retrieved pre-extracted PDF text: ${parsed.filename} (${pdfReferenceText.length} chars)`);
        } else {
          const pdfPath = path.join(process.cwd(), 'public', 'uploads', 'references', reference_pdf);
          if (fs.existsSync(pdfPath)) {
            const dataBuffer = fs.readFileSync(pdfPath);
            const pdfData = await pdfParse(dataBuffer);
            pdfReferenceText = pdfData.text || '';
            console.log(`Successfully parsed reference PDF: ${reference_pdf} (${pdfReferenceText.length} chars)`);
          }
        }
      } catch (err) {
        console.error('Error parsing reference PDF:', err);
      }
    }

    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullText = '';

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start' })}\n\n`));

          const response = await client.messages.create({
            model: 'claude-sonnet-4-5',
            max_tokens: 8192,
            stream: true,
            system: SYSTEM_PROMPT,
            messages: [{
              role: 'user',
              content: buildPrompt({
                contexto_canal: context || '',
                nicho: niche || '',
                subnicho: subniche || '',
                publico_alvo: publico_alvo || '',
                nivel_consciencia: nivel_consciencia || 3,
                inimigo_comum: inimigo_comum || '',
                emocao_primaria: emocao_primaria || '',
                tom_de_voz: tom_de_voz || '',
                titulo_video: title || '',
                idioma_narracao: idioma_narracao || 'Português',
                cultura_alvo: cultura_alvo || 'Brasil',
                palavras_por_bloco: Number(palavras_por_bloco) || 200,
                quantidade_blocos: Number(quantidade_blocos) || 5,
                ref_transcripts,
                pdf_reference_text: pdfReferenceText || undefined,
              })
            }]
          });

          for await (const chunk of response) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              fullText += chunk.delta.text;
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: 'progress', text: chunk.delta.text })}\n\n`
              ));
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'parsing' })}\n\n`));

          const parsed = parseScript(fullText);
          const result = {
            titulo: title,
            nicho: niche || '',
            subnicho: subniche || '',
            idioma: lang === 'pt' ? 'Português' : 'Inglês',
            analise_estrategica: parsed.analise_estrategica,
            thumbnail_prompt: parsed.thumbnail_prompt,
            cenas: parsed.cenas,
            contexto_canal: context,
            publico_alvo,
            idioma_narracao,
            cultura_alvo,
            quantidade_total_palavras: wordCount,
            reference_pdf,
            nivel_consciencia,
            inimigo_comum,
            emocao_primaria,
            tom_de_voz,
            quantidade_blocos,
            palavras_por_bloco,
          };

          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'done', data: result })}\n\n`
          ));
        } catch (error) {
          console.error('Script generation error:', error);
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'error', message: error instanceof Error ? error.message : String(error) })}\n\n`
          ));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });
  } catch (error: any) {
    console.error('POST handler error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Erro ao processar requisição' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
