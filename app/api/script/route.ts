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

function buildRefTranscriptsBlock(refTranscripts?: { title: string; transcript: string }[]): string {
  if (!refTranscripts || refTranscripts.length === 0) return '';
  return `

---REFERENCE TRANSCRIPTS (CRITICAL — STUDY BEFORE WRITING)---

Abaixo estão transcrições reais de vídeos desse canal. Antes de escrever uma palavra, analise profundamente:
1. O vocabulário usado — quais palavras repetem? Quais evita?
2. O ritmo das frases — longas e contemplativas ou curtas e diretas?
3. Como abre cada cena — pergunta retórica? Afirmação forte? Descrição visual?
4. Como cria tensão e curiosidade — loops, cliffhangers, revelações?
5. A relação com o público — íntima? distante? didática? emocional?

Escreva o novo roteiro como se fosse escrito pela mesma pessoa que escreveu essas transcrições. O público deve reconhecer a voz imediatamente.

${refTranscripts.map((t, i) => `TRANSCRIÇÃO ${i + 1}: "${t.title}"\n${t.transcript}`).join('\n---\n')}

---FIM DAS REFERÊNCIAS---`;
}

function buildPrompt(title: string, niche: string, subniche: string, context: string, wordCount: number, totalMinutes: number, refTranscripts?: { title: string; transcript: string }[]) {
  const scenesCount = getScenesCount(wordCount);
  const lang = detectLanguage(title);
  const narrLang = lang === 'pt' ? 'Português' : 'Inglês';
  const totalSeconds = Math.round((wordCount / 150) * 60);
  const secondsPerScene = Math.round(totalSeconds / scenesCount);
  const clipsPerScene = Math.ceil(secondsPerScene / 8);

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

  const refTranscriptsBlock = buildRefTranscriptsBlock(refTranscripts);

  return `## CHANNEL IDENTITY BRIEF

**Niche:** ${niche}
**Sub-niche:** ${subniche || 'Not specified — infer from title and niche'}
**Video Title:** ${title}
**Target Duration:** ${wordCount} words across ${scenesCount} scenes${personaBlock}${refTranscriptsBlock}

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
VIDEO CLIPS — CRITICAL MATH:
Each scene is ${secondsPerScene} seconds long.
The VEO3 generates exactly 8-second clips.
Therefore each scene needs exactly ${clipsPerScene} VIDEO prompts.
Generate EXACTLY ${clipsPerScene} [CLIP X/${clipsPerScene}] prompts per scene.
No more, no less.

Each clip is ONE continuous 8-second shot.
Do NOT describe multi-stage actions in a single clip.
ONE action per clip only.

CLIP VARIETY — vary shots across the ${clipsPerScene} clips:
- Opening clips (1-3): wide/establishing shots, slow zoom
- Middle clips (4-${clipsPerScene - 3}): close-ups, macro, different angles
- Closing clips (${clipsPerScene - 2}-${clipsPerScene}): detail shots, transition to next scene

FORMAT for each clip (mandatory):
[CLIP X/${clipsPerScene}] [SHOT TYPE], [SINGLE ACTION in 8 seconds], [ENVIRONMENT], [CAMERA MOVEMENT — locked off OR slow push OR slow pull], [LIGHTING], [X days/hours compressed into 8 seconds OR real-time 8-second shot], BBC Planet Earth II style, 4K 24fps, VEO3 8-second clip

EXAMPLE (for a germination scene):
[CLIP 1/${clipsPerScene}] Wide establishing shot, dry soil surface under harsh tropical midday light, camera locked off, harsh overhead sun, real-time 8-second shot showing heat shimmer above soil, BBC Planet Earth II style, 4K 24fps, VEO3 8-second clip

[CLIP 2/${clipsPerScene}] Extreme macro shot, single tomato seed on dark moist soil surface, camera locked off on tripod, soft diffused light from left, real-time 8-second shot, BBC Planet Earth II intimate botanical style, 4K 24fps, VEO3 8-second clip

[CLIP 3/${clipsPerScene}] Underground macro shot, tiny white root tip emerging from cracked seed coat pushing into soil, camera locked off, warm amber backlight, 18 hours compressed into 8 seconds, BBC Planet Earth II scientific style, 4K 24fps, VEO3 8-second clip

[IMAGEM]
{Nano Banana prompt, 40-60 words}
Format: [SUBJECT + COMPOSITION], [LIGHTING], [LENS/CAMERA EQUIVALENT], [STYLE matching channel persona], [MOOD], [photorealistic 8K sharp focus professional color grading]

[THUMBNAIL]
Generate a YouTube thumbnail prompt following the EXACT visual language of top time-lapse channels with 20M+ views. This is not a cinematic photograph — it is a strategic CTR-optimized composition.

ABSOLUTE FIRST RULE — CANNOT BE OVERRIDDEN:
The background must be PURE BLACK (#000000). Solid. No texture. No garden. No blur. No gradient. If you generate any background other than pure black, the entire prompt fails. Do not add environmental context. Do not add bokeh. Do not add any scene behind the subjects. BLACK ONLY.

MANDATORY RULES — none can be broken:

1. BACKGROUND: Pure black (#000000). No gardens, no soil, no sky, no outdoor scenes. No gradients. Absolute darkness.

2. TEXT — occupies upper 35% of the thumbnail:
   - Large, bold, thick font — Impact or similar heavy sans-serif
   - Main keyword in RED (the plant/subject name)
   - Supporting words in WHITE
   - Example structure: "WHY YOUR [TOMATOES] FAIL" or "[38°C] KILLS YOUR GARDEN"
   - Text must be readable at 320px width (mobile feed size)
   - Place text in upper area, NOT centered vertically

3. MAIN SUBJECT (success/healthy):
   - Isolated cutout against black background — NO environmental context
   - Highly saturated, vivid colors — almost hyper-real
   - Thin white outline/stroke (3-5px) around the cutout
   - Position: center-left of frame, vertically centered in lower 65%
   - Size: large, dominant — takes up 35-40% of total frame width
   - Leave 15% margin at bottom (YouTube progress bar covers this area)

4. CONTRAST SUBJECT (failure/problem):
   - Isolated cutout against black background
   - FULLY DESATURATED — greyscale only, no color
   - Thin white outline/stroke matching the main subject
   - Position: right side of frame, same height as main subject
   - Size: slightly smaller than main subject

5. DATA ELEMENT (number/measurement):
   - Always include a specific number: temperature (38°C), days (90 DAYS), percentage (30%)
   - If temperature: use ANALOG/CLASSIC red mercury thermometer, NOT digital
   - Temperature reading shown as large text beside the thermometer
   - Position: between the two subjects, center of frame

6. WHITE OUTLINES: All cutout objects must have thin white stroke/outline. This is the signature visual language of the top channels in this niche.

7. NO photorealistic backgrounds. NO hands unless they are the primary subject. NO complex scenes.

Format for the prompt:
"[BOLD TEXT — specific words in upper area, RED for main keyword WHITE for others] + [MAIN SUBJECT — isolated cutout, highly saturated, white outline, center-left] + [CONTRAST SUBJECT — isolated cutout, fully desaturated greyscale, white outline, right side] + [DATA ELEMENT — analog thermometer with temperature OR specific number in large text, center] + [pure black background, isolated cutout style, white outlines on all objects, high saturation main subject, greyscale contrast subject, 8K sharp, YouTube thumbnail composition]

IGNORE any visual logic suggesting a garden background. All subjects float on pure black. This is non-negotiable."

[DIREÇÃO]
{Production notes in Portuguese, 2-3 sentences}
— Música/trilha específica para o tom desta cena
— Color grading e mood visual
— Transição para próxima cena

---

## SCENE STRUCTURE — ${scenesCount} SCENES ACROSS ${wordCount} WORDS

Scene timing: each scene = ${secondsPerScene} seconds of narration approximately.
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
  const { title, niche, subniche, context, wordCount, ref_transcripts } = await request.json();

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
            content: buildPrompt(title, niche, subniche, context, wordCount, totalMinutes, ref_transcripts)
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
