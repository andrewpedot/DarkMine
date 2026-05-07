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

const narrationLabels: Record<string, string> = {
  pt: 'Narração',
  en: 'Narration',
};

function buildPrompt(title: string, niche: string, subniche: string, context: string, wordCount: number, totalMinutes: number) {
  const scenesCount = getScenesCount(wordCount);
  const sceneDuration = Math.round(totalMinutes / scenesCount);
  const lang = detectLanguage(title);
  const narrLabel = narrationLabels[lang];
  const dirLabel = lang === 'pt' ? 'Direção' : 'Direção';
  const narrLang = lang === 'pt' ? 'Português' : 'Inglês';

  const personaSection = context ? `
CRITICAL — CHANNEL PERSONA & AUDIENCE:
${context}

This is not optional context. This defines EVERYTHING about how you write:
- The narrator's voice, vocabulary and emotional register must match this persona exactly
- The depth and complexity of information must match the audience's knowledge level
- The pacing, sentence length and dramatic beats must reflect the channel's style
- Every narration line must feel like it could only come from THIS specific channel, not a generic documentary
- If the persona mentions a reference (e.g. Attenborough, specific YouTuber, specific style) — study that style and replicate its core patterns: sentence rhythm, use of silence, how facts are revealed, relationship with the viewer

Before writing the first word of narration, ask yourself: would a viewer who knows this channel recognize this as 'their' content? If not, rewrite.` : '';

  const subnicheSection = subniche ? `
SUBNICHE VISUAL CONTEXT: ${subniche}
All video and image prompts must reflect this specific subniche. Don't generate generic visuals — generate visuals specific to ${subniche}. Specific plant varieties, specific climate conditions, specific geographic context if applicable.` : '';

  return `You are a specialized scriptwriter for dark documentary and curiosity YouTube channels.

DADOS DO PROJETO / PROJECT DATA:
- Title: ${title}
- Niche: ${niche}
- Subniche: ${subniche || 'N/A'}${subnicheSection}
- Channel Context: ${context || 'Niche content, no specific persona defined'}${personaSection}
- Target Word Count: ${wordCount}
- Number of Scenes: ${scenesCount}
- Scene Duration: ~${sceneDuration} minutes each

${lang === 'pt' ? 'IDIOMA: A narração DEVE ser em Português. Apenas [DIREÇÃO] fica em Português.' : 'LANGUAGE: Narration MUST be in the same language as the title (' + lang + '). Only [DIREÇÃO] stays in Portuguese.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NARRAÇÃO STYLE — DAVID ATTENBOROUGH PLANET EARTH II
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Write narration in the EXACT style of David Attenborough in Planet Earth II — calm authority, scientific precision, emotional restraint. Each narration block must:
1. Open with a visual observation that hooks immediately — what the viewer is seeing right now
2. Deliver ONE concrete practical tip or fact naturally embedded — never as a list, always as revelation
3. Use short sentences. Real pauses come from periods, NOT ellipses. Maximum 3 ellipses per entire scene narration.
4. End with a contemplative line that bridges to the next scene
5. Average 80–120 words per narration block
6. NEVER use melodramatic words — Attenborough is calm, never theatrical
7. Always include at least one specific number, temperature, measurement or scientific fact per scene

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FORMAT — MANDATORY TAGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Each scene MUST contain exactly these tags:
[${narrLabel.toUpperCase()}] -> ${narrLang} narration text. Style: Attenborough, calm authority, scientific precision.
[VIDEO] -> English prompt for VEO3 / Kling AI (time-lapse generation). Format: [SHOT TYPE] + [SUBJECT ACTION] + [ENVIRONMENT DETAILS] + [CAMERA MOVEMENT] + [LIGHTING] + [DURATION COMPRESSED] + [STYLE REFERENCE] + [TECHNICAL SPECS]. Each video prompt: 40-60 words. Always mention compressed duration (ex: "7 days compressed to 12 seconds").
[IMAGEM] -> English prompt for Nano Banana (image generation). Format: [SUBJECT] + [COMPOSITION] + [LIGHTING] + [CAMERA/LENS] + [STYLE] + [MOOD] + [TECHNICAL PARAMS]. Scientific photography style, photorealistic.
[DIREÇÃO] -> Production notes in Portuguese (music, pacing, transitions, mood). Always in Portuguese.
[THUMBNAIL] -> English thumbnail prompt optimized for Nano Banana. Format: [MAIN VISUAL] + [BACKGROUND] + [LIGHTING] + [EMOTIONAL TRIGGER]. Rules: dark dramatic background, single striking visual element, extreme close-up or high contrast composition, triggers curiosity or urgency. End with: photorealistic, 8K, dark dramatic lighting, high contrast, thumbnail composition.

Use "---" on a separate line to separate each scene.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCENE TIMING FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Each scene is approximately ${sceneDuration} minutes. Use format: "X:XX" with leading zeros.
Example: scene 1 starts at 0:00, scene 2 starts at ${sceneDuration}:00, etc.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VIDEO PROMPT EXAMPLE (VEO3 / Kling AI)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"Ultra macro time-lapse, tomato flower petals slowly opening and releasing golden pollen in dappled morning light, tropical garden background softly blurred, camera locked off on tripod, warm directional light from left, 3 days compressed to 8 seconds, BBC Planet Earth II documentary style, 4K 24fps cinematic"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMAGE PROMPT EXAMPLE (Nano Banana)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"Extreme macro photograph of tomato pollen grains on anther surface, centered composition rule of thirds, dramatic side lighting from left casting long shadows, Canon MPE-65mm macro lens equivalent, botanical scientific photography style, clinical precision with organic beauty, photorealistic 8K sharp focus professional color grading"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
START NOW — Generate ${scenesCount} scenes in sequence. Each scene with all 5 blocks.`;
}

function parseScript(text: string, wordCount: number, totalMinutes: number): any[] {
  const scenesRaw = text.split(/---/);
  const scenes: any[] = [];
  let sceneId = 1;
  const scenesCount = getScenesCount(wordCount);
  const sceneDurationMinutes = Math.round(totalMinutes / scenesCount);

  for (const raw of scenesRaw) {
    if (!raw.trim()) continue;

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

    scenes.push({
      id: sceneId,
      titulo_cena: `Cena ${sceneId}`,
      tempo_inicio: startTime,
      tempo_fim: endTime,
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
