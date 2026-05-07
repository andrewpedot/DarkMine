export const maxDuration = 300;

function getScenesCount(targetWords: number): number {
  if (targetWords <= 2000) return 4;
  if (targetWords <= 3000) return 6;
  if (targetWords <= 3750) return 8;
  return 9;
}

function buildPrompt(title: string, niche: string, subniche: string, context: string, wordCount: number) {
  const scenesCount = getScenesCount(wordCount);
  return `Você é um roteirista especializado em canais Dark de documentários e curiosidades.
Sua tarefa é criar um roteiro detalhado e cativante para um vídeo de time-lapse.

DADOS DO PROJETO:
- Título: ${title}
- Nicho: ${niche}
- Subnicho: ${subniche || 'N/A'}
- Contexto do Canal: ${context || 'N/A'}
- Meta de Palavras: ${wordCount}

REGRAS OBRIGATÓRIAS DE FORMATAÇÃO:
1. O roteiro deve ser dividido em pelo menos ${scenesCount} cenas.
2. Cada cena DEVE conter exatamente estas tags para cada bloco de informação:
   [NARRAÇÃO] -> Texto em Português que será narrado. Estilo David Attenborough, pausas dramáticas (...).
   [VIDEO] -> Prompt em Inglês para geração de vídeo (Runway/Kling). Descreva a transformação time-lapse.
   [IMAGEM] -> Prompt em Inglês para geração de imagem (Midjourney/Flux). Foto macro cinematográfica.
   [DIREÇÃO] -> Notas de produção em Português (trilha, clima, transições).
3. Use "---" em uma linha isolada para separar cada cena.
4. TUDO deve estar em Português, EXCETO os prompts de [VIDEO] e [IMAGEM] que DEVEM estar em Inglês.

ESTILO DE NARRAÇÃO:
- Sentenças curtas (máx 15 palavras).
- Use "..." para marcar pausas de 2-3 segundos.
- Tom reverente e poético.

Inicie o roteiro agora:`;
}

function parseScript(text: string, wordCount: number): any[] {
  const scenesRaw = text.split(/---/);
  const scenes: any[] = [];
  let sceneId = 1;
  const sceneDuration = Math.round(wordCount / (scenesRaw.length || 1) / 150);

  for (const raw of scenesRaw) {
    if (!raw.trim()) continue;

    const narracaoMatch = raw.match(/\[NARRAÇÃO\]([\s\S]*?)(?=\[|$)/i);
    const videoMatch = raw.match(/\[VIDEO\]([\s\S]*?)(?=\[|$)/i);
    const imagemMatch = raw.match(/\[IMAGEM\]([\s\S]*?)(?=\[|$)/i);
    const direcaoMatch = raw.match(/\[DIREÇÃO\]([\s\S]*?)(?=\[|$)/i);

    if (!narracaoMatch && !videoMatch && !imagemMatch && !direcaoMatch) continue;

    scenes.push({
      id: sceneId,
      titulo_cena: `Cena ${sceneId}`,
      tempo_inicio: `${Math.floor((sceneId - 1) * sceneDuration / 60)}:${((sceneId - 1) * sceneDuration % 60).toString().padStart(2, '0')}`,
      tempo_fim: `${Math.floor(sceneId * sceneDuration / 60)}:${(sceneId * sceneDuration % 60).toString().padStart(2, '0')}`,
      narracao: narracaoMatch ? narracaoMatch[1].trim() : '',
      video: videoMatch ? videoMatch[1].trim() : '',
      imagem: imagemMatch ? imagemMatch[1].trim() : '',
      direcao: direcaoMatch ? direcaoMatch[1].trim() : '',
    });
    sceneId++;
  }

  return scenes;
}

export async function POST(request: Request) {
  const { title, niche, subniche, context, wordCount } = await request.json();

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
          messages: [{
            role: 'user',
            content: buildPrompt(title, niche, subniche, context, wordCount)
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

        const cenas = parseScript(fullText, wordCount);
        const result = {
          titulo: title,
          nicho: niche,
          duracao_total: `${Math.floor(cenas.length * 30 / 60)}:${(cenas.length * 30 % 60).toString().padStart(2, '0')}`,
          cenas
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
}
