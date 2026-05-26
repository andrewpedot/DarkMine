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

const SYSTEM_PROMPT = `Você é um Estrategista de YouTube de elite e um Roteirista Master, especialista em criar roteiros virais e de alta retenção. Sua habilidade única é clonar o ritmo de conteúdos de sucesso, garantir precisão lógica e aplicar engenharia de neuromarketing (focada puramente na força das palavras) de forma autônoma para cada nicho.`;

function buildRefTranscriptsBlock(refTranscripts?: { title: string; transcript: string }[]): string {
  if (!refTranscripts || refTranscripts.length === 0) return '';
  return `\n---REFERÊNCIAS DE TRANSCRIÇÃO---\n${refTranscripts.map((t, i) => `REFERÊNCIA ${i + 1}: "${t.title}"\n${t.transcript}`).join('\n---\n')}\n---FIM DAS REFERÊNCIAS---`;
}

function buildPrompt({
  contexto_canal,
  nicho,
  subnicho,
  publico_alvo,
  titulo_video,
  idioma_narracao,
  cultura_alvo,
  quantidade_total_palavras,
  ref_transcripts,
  pdf_reference_text,
}: {
  contexto_canal: string;
  nicho: string;
  subnicho: string;
  publico_alvo: string;
  titulo_video: string;
  idioma_narracao: string;
  cultura_alvo: string;
  quantidade_total_palavras: number;
  ref_transcripts?: { title: string; transcript: string }[];
  pdf_reference_text?: string;
}) {
  const refTranscriptsBlock = buildRefTranscriptsBlock(ref_transcripts);
  const pdfBlock = pdf_reference_text
    ? `\n---REFERÊNCIAS DE DOCUMENTO PDF ANEXADO (ESTUDE E APLIQUE ESSAS DIRETRIZES DE ROTEIRO, TÍTULOS E IMAGEM)---\n${pdf_reference_text}\n---FIM DAS REFERÊNCIAS PDF ANEXADO---\n`
    : '';

  return `## 1. DADOS DE ENTRADA
- Canal / Contexto da Persona: ${contexto_canal}
- Nicho: ${nicho}
- Subnicho: ${subnicho || 'Não especificado'}
- Público-Alvo: ${publico_alvo}
- Título do Vídeo: ${titulo_video}
- Idioma da Narração: ${idioma_narracao}
- País/Cultura Alvo: ${cultura_alvo}
- Tamanho Total do Roteiro: ~${quantidade_total_palavras} palavras
${pdfBlock}
## 2. TRANSCRIÇÕES DE REFERÊNCIA (O RITMO)
${refTranscriptsBlock || 'Nenhuma transcrição de referência fornecida.'}
**Regra de Clonagem:** Mimetize estritamente o RITMO, a estrutura de ganchos e a cadência destas referências. Extraia apenas a engenharia da atenção, nunca o conteúdo exato.

## 3. LOCALIZAÇÃO CULTURAL
Pense e escreva DIRETAMENTE como um nativo de: ${cultura_alvo}.
- Use expressões e nomenclaturas oficiais consagradas neste país e idioma.
- A narrativa deve soar 100% orgânica para as dores e tradições locais.

## 4. ENGENHARIA DE ROTEIRO E PSICOLOGIA (AUTO-DEDUÇÃO)
Como roteirista experiente, você deve deduzir a psicologia do público com base no nicho e aplicar as seguintes regras em todo o texto:
1. ATAQUE O CÉREBRO LÍMBICO: Deduza qual é a emoção primária deste público (Medo de perder algo ou Ganância/Desejo de alcançar algo). O início do roteiro deve ser puramente focado nessa emoção. A lógica entra apenas depois para justificar.
2. GANCHO DE 5 SEGUNDOS E O INIMIGO COMUM: Deduza qual é o "inimigo comum" do ${publico_alvo} (ex: o algoritmo, a indústria, a falta de tempo). Nos primeiros 10 segundos, valide o ${titulo_video} unindo-se ao público contra esse inimigo. Zero enrolação.
3. O MECANISMO ÚNICO (OPEN LOOP): A solução não pode ser "mais do mesmo". Estruture a revelação central como um caminho novo ou uma perspectiva ignorada. Abra esse mistério no Bloco 1 e entregue a resposta no último bloco.
4. MICRO-GANCHOS: Quebre o roteiro em blocos lógicos. A ÚLTIMA frase de CADA bloco deve ser um cliffhanger (micro-gancho), forçando o espectador a querer ouvir a próxima parte.
5. IMAGENS MENTAIS E RITMO: Como não haverá direcionamento visual, suas palavras devem ser altamente descritivas. Pinte o cenário na mente do espectador.
6. CONTROLE DE TAMANHO: O seu roteiro FINAL (a soma de todas as narrações) deve ter rigorosamente a média de ~${quantidade_total_palavras} palavras. Distribua esse volume de forma inteligente entre a introdução, desenvolvimento e conclusão.

## 5. ANÁLISE PRÉVIA (CHAIN OF THOUGHT)
Gere o bloco [ANÁLISE ESTRATÉGICA]. Responda em 4 frases curtas (em Português):
1. Qual é a emoção primária (Medo ou Ganância) e o inimigo comum implícitos neste nicho?
2. Qual será o Mecanismo Único (a revelação/ângulo novo) deste vídeo?
3. A premissa central é factualmente precisa e logicamente sólida para o ${subnicho || nicho}? (Elimine falhas lógicas agora).
4. Como a ${cultura_alvo} ditará as expressões e a empatia do texto?

## 6. FORMATO DE SAÍDA ESTRITO
Não adicione textos explicativos fora destes blocos. Divida o roteiro em quantos blocos forem necessários para atingir a meta de palavras de forma fluida.

[ANÁLISE ESTRATÉGICA]
(Sua análise de 4 pontos)

---
[BLOCO: 1 | Introdução e Gancho]
[NARRAÇÃO]
(Texto nativo em ${idioma_narracao}. Frase final atua como Micro-Gancho.)

---
[BLOCO: 2 | Título do Bloco]
[NARRAÇÃO]
(Texto nativo em ${idioma_narracao}. Continuação fluida.)

---
(Continue gerando blocos até que a soma total da narração atinja aproximadamente ${quantidade_total_palavras} palavras)

[THUMBNAIL_PROMPT]
(Gere um prompt em Inglês para a miniatura seguindo estes padrões validados de YouTube:
- Contraste extremo (Cores complementares ou objeto saturado em fundo escuro).
- Foco em transmitir a emoção primária deduzida.
- Elemento principal grande e isolado (Ocupando 40% da tela).
- Sugestão de texto na imagem: Máximo de 3 palavras de alto impacto, fáceis de ler no celular, em fonte grossa.
- Gatilho visual: Um detalhe incongruente ou uma seta/círculo vermelho sutil que gere curiosidade instantânea.)`;
}

function parseScript(text: string): { analise_estrategica: string; cenas: any[]; thumbnail_prompt: string } {
  // 1. Extract Análise Estratégica
  const analiseMatch = text.match(/\[ANÁLISE ESTRATÉGICA\]([\s\S]*?)(?=\-\-\-|\[BLOCO|$)/i);
  const analise_estrategica = analiseMatch ? analiseMatch[1].trim() : '';

  // 2. Extract Thumbnail Prompt
  const thumbMatch = text.match(/\[THUMBNAIL_PROMPT\]([\s\S]*?)$/i);
  const thumbnail_prompt = thumbMatch ? thumbMatch[1].trim() : '';

  // Remove thumbnail prompt from text to avoid matching it in last block
  const mainText = thumbMatch ? text.slice(0, thumbMatch.index) : text;

  // 3. Extract blocks
  const cenas: any[] = [];
  const blockRegex = /\[BLOCO:\s*(\d+)\s*\|\s*([^\]]+)\]/gi;
  let match;
  const matches: { index: number; id: number; title: string }[] = [];
  
  while ((match = blockRegex.exec(mainText)) !== null) {
    matches.push({
      index: match.index,
      id: parseInt(match[1]),
      title: match[2].trim()
    });
  }

  for (let i = 0; i < matches.length; i++) {
    const startIdx = matches[i].index;
    const endIdx = i + 1 < matches.length ? matches[i + 1].index : mainText.length;
    const blockContent = mainText.substring(startIdx, endIdx);

    const narracaoMatch = blockContent.match(/\[NARRAÇÃO\]([\s\S]*?)$/i);
    const narracao = narracaoMatch ? narracaoMatch[1].trim() : '';

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
    } = body;

    const lang = detectLanguage(title);

    let pdfReferenceText = '';
    if (reference_pdf) {
      try {
        const pdfPath = path.join(process.cwd(), 'public', 'uploads', 'references', reference_pdf);
        if (fs.existsSync(pdfPath)) {
          const dataBuffer = fs.readFileSync(pdfPath);
          const pdfData = await pdfParse(dataBuffer);
          pdfReferenceText = pdfData.text || '';
          console.log(`Successfully parsed reference PDF: ${reference_pdf} (${pdfReferenceText.length} chars)`);
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
                titulo_video: title || '',
                idioma_narracao: idioma_narracao || 'Português',
                cultura_alvo: cultura_alvo || 'Brasil',
                quantidade_total_palavras: Number(wordCount) || 3000,
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
