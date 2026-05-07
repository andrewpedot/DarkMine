'use server';
import { updateProject } from './db';

export interface TimeLapseScene {
  id: number;
  titulo_cena: string;
  tempo_inicio: string;
  tempo_fim: string;
  narracao: string;
  prompt_video: string;
  prompt_imagem: string;
  direcao: string;
}

export interface TimeLapseScript {
  titulo: string;
  nicho: string;
  duracao_total: string;
  cenas: TimeLapseScene[];
}

function getScenesCount(targetWords: number): number {
  if (targetWords <= 2000) return 4;
  if (targetWords <= 3000) return 6;
  if (targetWords <= 3750) return 8;
  return 9;
}

export async function generateScript(
  title: string,
  niche: string,
  targetWords: number,
  projectId?: string,
  subniche?: string,
  channelContext?: string,
): Promise<TimeLapseScript> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Erro: Chave da Anthropic não encontrada no .env');

  const scenesCount = getScenesCount(targetWords);
  const wordsPerScene = Math.round(targetWords / scenesCount);
  const estimatedMinutes = Math.round(targetWords / 150);

  const subnicheInstruction = subniche
    ? `\nSUBNICHE (use in VIDEO and IMAGE prompts for visual specificity): "${subniche}"`
    : '';

  const channelContextInstruction = channelContext
    ? `\nCHANNEL CONTEXT (use to calibrate narration tone and direction notes): "${channelContext}"`
    : '';

  const systemPrompt = `You are an expert scriptwriter for dark faceless YouTube channels specializing in time-lapse nature documentary content. Your narration style is David Attenborough in Planet Earth — sparse, poetic, reverent, with dramatic silences between impactful phrases.

You must generate a complete time-lapse documentary script. The narration is in ENGLISH and will be read by a deep, calm voice over AI-generated time-lapse footage. Practical tips about tropical climate cultivation are woven naturally into the visual observation — never lecturing, always observing.

NARRATION RULES:
- Short sentences. Maximum 15 words before a natural pause.
- Use "..." to mark dramatic pauses — give the viewer time to absorb each thought.
- The visual is the protagonist. Narration AMPLIFIES what the eye sees, never competes with it.
- Each narration block: approximately ${wordsPerScene} words.
- Total narration across all ${scenesCount} scenes: approximately ${targetWords} words.
- Weave practical tropical cultivation tips naturally — let them emerge from observation, not from instruction.

VIDEO PROMPT RULES (Runway ML / Kling AI — time-lapse):
- English only.
- Describe the exact visual transformation in the time-lapse.
- Format: [subject] [transformation/movement], [lighting], [camera angle], time-lapse, 4K, cinematic documentary, [mood]
- Example: "Tomato seedling emerging from dark tropical soil, roots first then green shoot rising, warm golden side-lighting, extreme macro, time-lapse, 4K, cinematic documentary, reverent"

IMAGE PROMPT RULES (Midjourney / Flux — static cutaway shots):
- English only.
- Still beauty shots between time-lapse segments.
- No text in image.
- Format: [subject], [setting/mood], [lighting], cinematic nature photography, highly detailed, --ar 16:9

DIRECTION RULES (production notes in Portuguese):
- Music cue: type and energy level.
- Narration timing: when it enters and exits.
- Pacing: slow / medium / fast.
- Transition to next scene.
- Text overlay or chapter marker if applicable.

Return ONLY valid JSON, no markdown, no explanation:
{
  "titulo": "string",
  "nicho": "string",
  "duracao_total": "string",
  "cenas": [
    {
      "id": 1,
      "titulo_cena": "string",
      "tempo_inicio": "0:00",
      "tempo_fim": "3:00",
      "narracao": "string — English, Attenborough style, ~${wordsPerScene} words",
      "prompt_video": "string — English, Runway/Kling format",
      "prompt_imagem": "string — English, Midjourney/Flux format with --ar 16:9",
      "direcao": "string — Portuguese, production notes"
    }
  ]
}`;

  const userMessage = `Video Title: "${title}"
Niche: "${niche}"${subnicheInstruction}${channelContextInstruction}
Target Word Count: ${targetWords} words (~${estimatedMinutes} min)
Number of Scenes: ${scenesCount}
Words per narration scene: ~${wordsPerScene}
Climate focus: tropical/subtropical

Generate the complete time-lapse documentary script in JSON only.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Erro da Anthropic: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  let content = data.content[0].text.trim();

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) content = jsonMatch[0];
  else if (content.startsWith('```json')) content = content.replace(/^```json\n?/, '').replace(/\n?```$/, '');
  else if (content.startsWith('```')) content = content.replace(/^```\n?/, '').replace(/\n?```$/, '');

  const result: TimeLapseScript = JSON.parse(content.trim());

  if (projectId) {
    await updateProject(projectId, {
      title_final: title,
      script_content: result,
      status: 'script',
    });
  }

  return result;
}
