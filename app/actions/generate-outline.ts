'use server';

export const maxDuration = 60;

import { updateProject } from './db';

export async function generateOutline(title: string, lengthInMinutes: number, narrativeFormat: string, useCulturalAdaptation: boolean, market: string, projectId?: string) {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
        throw new Error('Erro: Chave da Anthropic não encontrada no .env');
    }

    const formatInstruction = narrativeFormat === 'Documentário Histórico'
        ? `Você deve usar o seguinte padrão de escalada histórico: Contexto Normal -> Detalhe Ignorado -> Consequências Crescentes -> Decisão Crítica -> Resultado Irreversível.`
        : `Você deve usar a seguinte estrutura de Storytelling Viral (3 Atos): Ato 1 (Hook & Setup - Tensão nos primeiros 10s), Ato 2 (Escalation & Conflict - Reviravoltas), Ato 3 (Twist & Moral - Resolução emocional).`;

    const culturalInstruction = useCulturalAdaptation 
        ? `\nREGRA DE LOCALIZAÇÃO CULTURAL: Este roteiro é uma adaptação de um conteúdo estrangeiro para o mercado: ${market}. Você é estritamente proibido de fazer traduções literais. Você DEVE adaptar o contexto cultural:
- Converta métricas (ex: milhas para km, Fahrenheit para Celsius).
- Adapte analogias esportivas ou marcas hiper-locais americanas para o equivalente cultural do país alvo (ex: trocar referências de beisebol/futebol americano por futebol ou contextos universais).
- Use expressões idiomáticas, gírias e sintaxe natural de um falante nativo do ${market}.
O objetivo é que o espectador sinta que o roteiro foi pensado e escrito originalmente no país dele, mantendo o exato impacto emocional da obra original.` 
        : '';

    const systemPrompt = `Você é um Arquiteto de Roteiros Especialista em Retenção de YouTube. O usuário enviará um título e o tamanho desejado do vídeo. 
Seu trabalho é gerar APENAS A ESTRUTURA (Outline) do roteiro, dividindo o vídeo em blocos ou atos.

REGRAS OBRIGATÓRIAS:
1. Retorne APENAS um JSON válido.
2. Não escreva o roteiro (texto/locução), apenas a estrutura com o título de cada fase e uma duração estimada.
3. REGRA DE ESCRITA PARA ÁUDIO: Este roteiro será narrado por uma voz madura para um público que apenas ESCUTA o vídeo enquanto faz outras coisas. Ao nomear as fases e planejar a estrutura, considere:
- Ritmo auditivo: Planeje blocos curtos o suficiente para manter a atenção de quem ouve passivamente. Evite blocos longos sem transição.
- Tom narrativo: A estrutura deve guiar um tom calmo, sábio, como um documentarista clássico da BBC ou um avô contando um segredo na beira da fogueira. Fuja do tom "youtuber eufórico".
- Repetição estratégica: Inclua pontos de retomada nos nomes das fases para recontextualizar o ouvinte que pode ter se distraído.
4. ${formatInstruction}${culturalInstruction}
5. Use o seguinte formato JSON rigorosamente:

{
  "roteiro": [
    { "id": 1, "fase": "Hook", "duracao_estimada": "1 min", "status": "pendente", "texto": "", "instrucao_visual": "" },
    { "id": 2, "fase": "Ato 1: O Contexto", "duracao_estimada": "4 min", "status": "pendente", "texto": "", "instrucao_visual": "" }
  ]
}
    
O número de blocos deve ser proporcional ao tamanho do vídeo (${lengthInMinutes} minutos).`;

    const userMessage = `Título do Vídeo: "${title}"\nTamanho Alvo do Vídeo: ${lengthInMinutes} minutos.\n\nGere a estrutura (outline) em JSON.`;

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-beta': 'max-tokens-3-5-sonnet-2024-07-15'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-5-20250929',
                max_tokens: 4096,
                system: systemPrompt,
                messages: [
                    { role: 'user', content: userMessage }
                ]
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Erro da Anthropic: ${response.status} - ${errorBody}`);
        }

        const data = await response.json();
        let content = data.content[0].text.trim();

        const jsonMatch = content.match(/\{[\s\S]*\}$/m);
        if (jsonMatch) {
            content = jsonMatch[0];
        } else if (content.startsWith('\`\`\`json')) {
            content = content.replace(/^\`\`\`json\n?/, '').replace(/\n?\`\`\`$/, '');
        } else if (content.startsWith('\`\`\`')) {
            content = content.replace(/^\`\`\`\n?/, '').replace(/\n?\`\`\`$/, '');
        }

        let result = JSON.parse(content.trim());

        if (projectId) {
            await updateProject(projectId, {
                title_final: title,
                script_content: result,
                status: 'script'
            });
        }

        return result;
    } catch (error) {
        console.error('[Error generating outline]:', error);
        throw error instanceof Error ? error : new Error(String(error));
    }
}
