'use server';
import { updateProject } from './db';

export interface CopywritingBlock {
  id: number;
  titulo_cena: string;
  narracao: string;
}

export interface CopywritingScript {
  titulo: string;
  nicho: string;
  subnicho: string;
  analise_estrategica: string;
  thumbnail_prompt: string;
  cenas: CopywritingBlock[];
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
}) {
  const refTranscriptsBlock = buildRefTranscriptsBlock(ref_transcripts);

  return `## 1. DADOS DE ENTRADA
- Canal / Contexto da Persona: ${contexto_canal}
- Nicho: ${nicho}
- Subnicho: ${subnicho || 'Não especificado'}
- Público-Alvo: ${publico_alvo}
- Título do Vídeo: ${titulo_video}
- Idioma da Narração: ${idioma_narracao}
- País/Cultura Alvo: ${cultura_alvo}
- Tamanho Total do Roteiro: ~${quantidade_total_palavras} palavras

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

function parseScript(text: string): { analise_estrategica: string; cenas: CopywritingBlock[]; thumbnail_prompt: string } {
  // 1. Extract Análise Estratégica
  const analiseMatch = text.match(/\[ANÁLISE ESTRATÉGICA\]([\s\S]*?)(?=\-\-\-|\[BLOCO|$)/i);
  const analise_estrategica = analiseMatch ? analiseMatch[1].trim() : '';

  // 2. Extract Thumbnail Prompt
  const thumbMatch = text.match(/\[THUMBNAIL_PROMPT\]([\s\S]*?)$/i);
  const thumbnail_prompt = thumbMatch ? thumbMatch[1].trim() : '';

  // Remove thumbnail prompt from text to avoid matching it in last block
  const mainText = thumbMatch ? text.slice(0, thumbMatch.index) : text;

  // 3. Extract blocks
  const cenas: CopywritingBlock[] = [];
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

export async function generateScript(params: {
  title: string;
  niche: string;
  subniche?: string;
  context?: string;
  publico_alvo?: string;
  idioma_narracao?: string;
  cultura_alvo?: string;
  wordCount?: number;
  projectId?: string;
  ref_transcripts?: { title: string; transcript: string }[];
}): Promise<CopywritingScript> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Erro: Chave da Anthropic não encontrada no .env');

  const {
    title,
    niche,
    subniche = '',
    context = '',
    publico_alvo = '',
    idioma_narracao = 'Português',
    cultura_alvo = 'Brasil',
    wordCount = 3000,
    projectId,
    ref_transcripts
  } = params;

  const promptText = buildPrompt({
    contexto_canal: context,
    nicho: niche,
    subnicho: subniche,
    publico_alvo,
    titulo_video: title,
    idioma_narracao,
    cultura_alvo,
    quantidade_total_palavras: wordCount,
    ref_transcripts,
  });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: promptText }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Erro da Anthropic: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  const content = data.content[0].text.trim();

  const parsed = parseScript(content);

  const result: CopywritingScript = {
    titulo: title,
    nicho: niche,
    subnicho: subniche || '',
    analise_estrategica: parsed.analise_estrategica,
    thumbnail_prompt: parsed.thumbnail_prompt,
    cenas: parsed.cenas
  };

  if (projectId) {
    await updateProject(projectId, {
      title_final: title,
      script_content: result,
      status: 'script',
    });
  }

  return result;
}
