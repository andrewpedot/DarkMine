export const maxDuration = 300;

function getScenesCount(targetWords: number): number {
  if (targetWords <= 2000) return 4;
  if (targetWords <= 3000) return 6;
  if (targetWords <= 3750) return 8;
  return 9;
}

function detectLanguage(text: string): string {
  const ptPatterns = /[áéíóúàèìòùâêîôûãõñç]/i;
  const enPatterns = /\b(the|is|are|was|were|and|or|but|to|in|on|at|for|with|from|this|that|these|those|a|an|of|it|its|be|have|has|had|will|would|could|should|may|might|must|shall|can)\b/i;
  const ptMatches = (text.match(ptPatterns) || []).length;
  const enMatches = (text.match(enPatterns) || []).length;
  return ptMatches >= enMatches ? 'pt' : 'en';
}

const SYSTEM_PROMPT = `You are a world-class documentary scriptwriter and YouTube channel strategist. You have written scripts for BBC, National Geographic, and the top 1% of faceless YouTube channels across every niche imaginable.

Your output is not generic content. Every script you write is deeply calibrated to a specific channel identity — its niche, its audience, its voice, its emotional register. You treat the channel persona like a director's brief: it overrides everything else.

You write with the precision of a scientist, the rhythm of a poet, and the strategy of a growth hacker. Every word serves retention. Every sentence earns the next.`;

function buildPrompt(title: string, niche: string, subniche: string, context: string, wordCount: number, totalMinutes: number) {
  const scenesCount = getScenesCount(wordCount);
  const lang = detectLanguage(title);
  const sceneDurationSecs = Math.round((wordCount / scenesCount) * 0.5);
  const narrLang = lang === 'pt' ? 'Português' : 'Inglês';

  const personaBlock = context ? `

**CHANNEL PERSONA & AUDIENCE (CRITICAL — READ CAREFULLY):**
${context}

This persona brief is the single most important input. Before writing anything:
1. Identify the narrator's voice archetype (calm authority? curious explorer? urgent investigator? warm educator?)
2. Identify the audience's sophistication level (beginner? intermediate? expert enthusiast?)
3. Identify the emotional register (contemplative? thrilling? unsettling? inspiring?)
4. Identify the pacing style (slow-burn Attenborough? fast-cut MrBeast? methodical explainer?)
5. Write AS this channel. A viewer who watches this channel regularly should immediately recognize the voice.

DO NOT write generic documentary narration. Write narration that ONLY this specific channel would write.` : `

**No persona provided.** Default to: calm educational documentary style, intermediate audience, natural curiosity tone.`;

  return `## CHANNEL IDENTITY BRIEF

**Niche:** ${niche}
**Sub-niche:** ${subniche || 'Not specified — infer from title and niche'}
**Video Title:** ${title}
**Target Duration:** ${wordCount} words across ${scenesCount} scenes${personaBlock}

---

## SCRIPT REQUIREMENTS

**Language:** Detect the language of the title "${title}" and write ALL narration in that exact language (${narrLang}). [DIREÇÃO] blocks always in Portuguese regardless.

**Niche accuracy:** Every visual, every fact, every analogy must be specific to "${niche}" — "${subniche || niche}". No generic footage. No generic facts. Specific varieties, specific measurements, specific conditions relevant to this exact sub-niche.

**STRICT WORD LIMIT:** Each [NARRAÇÃO] block must be between 80 and 120 words. Count the words before submitting. If over 120, cut. This is not a suggestion — it is a hard constraint. Longer narration kills retention in time-lapse videos.

---

## OUTPUT FORMAT — STRICT

Generate exactly ${scenesCount} scenes. Each scene must contain all 5 blocks in this exact order:

[CENA: {number} | {scene_title} | {start_time}–{end_time}]

[NARRAÇÃO]
{narration in detected language, 80-120 words}
— Opens with what the viewer sees right now
— Embeds ONE concrete practical insight as natural revelation, never as a list
— Uses periods for rhythm, NOT ellipses (max 2 ellipses per scene)
— Includes at least one specific number, measurement or scientific fact
— Tone, vocabulary and pacing MUST match the channel persona brief above
— Ends with a line that creates tension or curiosity for the next scene

[VIDEO]
{VEO3 / Kling AI prompt, 40-60 words}
Format: [SHOT TYPE], [SUBJECT + ACTION], [ENVIRONMENT], [CAMERA MOVEMENT], [LIGHTING], [X days/hours compressed to Y seconds], [BBC Planet Earth II style / specify style matching persona], [4K 24fps]

MANDATORY: Every [VIDEO] prompt MUST include a specific time compression (e.g. "7 days compressed to 12 seconds", "48-hour cycle compressed to 8 seconds"). Never write a video prompt without this.

[IMAGEM]
{Nano Banana prompt, 40-60 words}
Format: [SUBJECT + COMPOSITION], [LIGHTING], [LENS/CAMERA EQUIVALENT], [STYLE matching channel persona], [MOOD], [photorealistic 8K sharp focus professional color grading]

[THUMBNAIL]
{Nano Banana thumbnail prompt, 30-40 words}
Format: [MAIN VISUAL — single striking element], [DARK DRAMATIC BACKGROUND], [LIGHTING — high contrast], [EMOTIONAL TRIGGER — curiosity/shock/urgency], [photorealistic 8K dark dramatic lighting high contrast thumbnail composition]

[DIREÇÃO]
{Production notes in Portuguese, 2-3 sentences}
— Música/trilha específica para o tom desta cena
— Color grading e mood visual
— Transição para próxima cena

---

## SCENE STRUCTURE — ${scenesCount} SCENES ACROSS ${wordCount} WORDS

Scene timing: each scene = ${sceneDurationSecs} seconds of narration approximately.
Total video duration: ~${totalMinutes} minutes.

Scene arc must follow this emotional journey:
- Scene 1: Hook — show the problem/phenomenon that makes the viewer need to watch
- Scenes 2-${Math.round(scenesCount * 0.4)}: Build tension — deepen the why, add complexity
- Scenes ${Math.round(scenesCount * 0.4) + 1}-${Math.round(scenesCount * 0.7)}: Turn — introduce the solution/revelation
- Scenes ${Math.round(scenesCount * 0.7) + 1}-${scenesCount - 1}: Resolution — show the transformation
- Scene ${scenesCount}: Payoff — emotional conclusion that rewards the viewer

QUALITY BAR: If any narration line could appear in a different channel's script without feeling out of place, rewrite it until it couldn't.

---

Use "---" on a separate line to separate each scene.

START NOW — Generate ${scenesCount} scenes in sequence.`;
}

function parseScript(text: string, wordCount: number, totalMinutes: number): any[] {
  const scenesRaw = text.split(/---/);
  const scenes: any[] = [];
  let sceneId = 1;
  const scenesCount = getScenesCount(wordCount);
  const sceneDurationMinutes = Math.round(totalMinutes / scenesCount);

  for (const raw of scenesRaw) {
    if (!raw.trim()) continue;

    const cenaMatch = raw.match(/\[CENA:\s*(\d+)\s*\|\s*([^|\]]+)\s*\|\s*([\d:]+)–([\d:]+)\]/i);
    const narracaoMatch = raw.match(/\[NARRAÇÃO\]([\s\S]*?)(?=\[|$)/i) ||
                          raw.match(/\[NARRATION\]([\s\S]*?)(?=\[|$)/i);
    const videoMatch = raw.match(/\[VIDEO\]([\s\S]*?)(?=\[|$)/i);
    const imagemMatch = raw.match(/\[IMAGEM\]([\s\S]*?)(?=\[|$)/i) ||
                       raw.match(/\[IMAGE\]([\s\S]*?)(?=\[|$)/i);
    const direcaoMatch = raw.match(/\[DIREÇÃO\]([\s\S]*?)(?=\[|$)/i);
    const thumbnailMatch = raw.match(/\[THUMBNAIL\]([\s\S]*?)(?=\[|$)/i);

    if (!narracaoMatch && !videoMatch && !imagemMatch && !direcaoMatch && !thumbnailMatch) continue;

    const startMinutes = (sceneId - 1) * sceneDurationMinutes;
    const endMinutes = sceneId * sceneDurationMinutes;
    const startTime = `${Math.floor(startMinutes / 60)}:${(startMinutes % 60).toString().padStart(2, '0')}`;
    const endTime = `${Math.floor(endMinutes / 60)}:${(endMinutes % 60).toString().padStart(2, '0')}`;
    const sceneTitle = cenaMatch ? cenaMatch[2].trim() : `Cena ${sceneId}`;
    const parsedStartTime = cenaMatch ? cenaMatch[3].trim() : startTime;
    const parsedEndTime = cenaMatch ? cenaMatch[4].trim() : endTime;

    scenes.push({
      id: sceneId,
      titulo_cena: sceneTitle,
      tempo_inicio: parsedStartTime,
      tempo_fim: parsedEndTime,
      narracao: narracaoMatch ? narracaoMatch[1].trim() : '',
      video: videoMatch ? videoMatch[1].trim() : '',
      imagem: imagemMatch ? imagemMatch[1].trim() : '',
      direcao: direcaoMatch ? direcaoMatch[1].trim() : '',
      thumbnail: thumbnailMatch ? thumbnailMatch[1].trim() : '',
    });
    sceneId++;
  }

  return scenes;
}

export async function POST(request: Request) {
  const { title, niche, subniche, context, wordCount } = await request.json();

  const totalMinutes = Math.round(wordCount / 150);
  const lang = detectLanguage(title);

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
            content: buildPrompt(title, niche, subniche, context, wordCount, totalMinutes)
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

        const cenas = parseScript(fullText, wordCount, totalMinutes);
        const totalDuration = `${Math.floor(totalMinutes / 60)}:${(totalMinutes % 60).toString().padStart(2, '0')}`;
        const result = {
          titulo: title,
          nicho: niche,
          duracao_total: totalDuration,
          idioma: lang === 'pt' ? 'Português' : 'Inglês',
          total_words: wordCount,
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
