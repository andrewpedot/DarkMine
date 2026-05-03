'use server';

export const maxDuration = 60;
export const runtime = 'edge';

import { updateProject } from './db';

export async function generateScript(title: string, lengthInMinutes: number, projectId?: string) {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
        throw new Error('Erro: Chave da Anthropic não encontrada no .env');
    }

    const systemPrompt = `Você é um Roteirista Especialista em Retenção de YouTube. O usuário enviará um título e o tamanho desejado do vídeo. 
Seu trabalho é gerar um roteiro de alta retenção, dividido em blocos estratégicos. 

REGRAS OBRIGATÓRIAS:
1. Sea EXTREMAMENTE CONCISO. Use parágrafos densos mas não ultrapasse 2500 palavras no total.
2. O roteiro deve ter ${lengthInMinutes * 150} palavras (150/min). Não exceda 2500 palavras.
3. Você DEVE fechar todas as chaves do JSON perfeitamente antes de concluir.
4. Retorne ESTRITAMENTE um objeto JSON válido, sem texto adicional.

JSON EXIGIDO:
{
  "roteiro": [
    { "fase": "Hook (0-30s)", "texto": "...", "instrucao_visual": "..." },
    { "fase": "Contexto & Setup", "texto": "...", "instrucao_visual": "..." },
    { "fase": "Desenvolvimento/Mistério", "texto": "...", "instrucao_visual": "..." },
    { "fase": "O Clímax (Payoff)", "texto": "...", "instrucao_visual": "..." },
    { "fase": "Call to Action", "texto": "...", "instrucao_visual": "..." }
  ]
}`;

    const userMessage = `Título do Vídeo: "${title}"\nTamanho Alvo do Vídeo: ${lengthInMinutes} minutos.\n\nGere o roteiro estruturado e conciso.`;

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
            console.error('[Anthropic Error]:', errorBody);
            throw new Error(`Erro da Anthropic: ${response.status} - ${errorBody}`);
        }

        const data = await response.json();
        let content = data.content[0].text.trim();

        const jsonMatch = content.match(/\{[\s\S]*\}$/m);
        if (jsonMatch) {
            content = jsonMatch[0];
        } else if (content.startsWith('```json')) {
            content = content.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        } else if (content.startsWith('```')) {
            content = content.replace(/^```\n?/, '').replace(/\n?```$/, '');
        }

        let result;
        try {
            result = JSON.parse(content.trim());
        } catch (parseError) {
            console.error('Falha no Parse. O JSON retornado foi cortado. Limite de tokens atingido.');
            throw new Error('JSON retornado pela Anthropic estava incompleto. Tente encurtar o roteiro.');
        }

        if (projectId) {
            await updateProject(projectId, {
                title_final: title,
                script_content: result,
                status: 'script'
            });
        }

        return result;
    } catch (error) {
        console.error('[Error generating script]:', error);
        throw error instanceof Error ? error : new Error(String(error));
    }
}