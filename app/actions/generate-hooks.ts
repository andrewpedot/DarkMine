'use server';

import { createProject, updateProject } from './db';

export async function generateHooks(originalTitle: string, market: string, projectId?: string) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
        throw new Error('Erro: Chave da Anthropic não encontrada no .env');
    }

    const systemPrompt = `Você é um Master Copywriter de YouTube especializado em localização. O usuário enviará um título outlier em inglês e o mercado alvo (um dos idiomas de alto RPM). Seu objetivo NÃO é traduzir literalmente, mas criar um Clone Cultural que mantenha o exato gatilho psicológico e o contexto original, usando gírias e a sintaxe natural do idioma/pís escolhido. A prioridade é manter o significado intacto, não importa o tamanho do título. Retorne APENAS um JSON válido.
IMPORTANTE: Traduza e adapte os gatilhos psicológicos e os títulos estritamente para o idioma: [${market}], mantendo o tom nativo e a alta taxa de cliques.

JSON:
{
  "analise_psicologica": "Qual foi o gatilho exato que fez o título original viralizar?",
  "variacoes": [
    { "titulo": "O Clone Cultural Fiel", "emocao": "Clone Exato", "ctr_estimado": 99 },
    { "titulo": "Opção B para Teste A/B (Mesma ideia, palavras diferentes)", "emocao": "Curiosidade", "ctr_estimado": 95 },
    { "titulo": "Opção C para Teste A/B (Foco em urgência)", "emocao": "Urgência", "ctr_estimado": 90 }
  ]
}`;

    const userMessage = `Título Original: "${originalTitle}"\nMercado Alvo: ${market}\n\nGere o clone cultural em formato JSON respeitando rigorosamente as regras, traduzindo para o idioma: [${market}].`;

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-5-20250929',
                max_tokens: 1024,
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

        const result = JSON.parse(content.trim());

        let savedProjectId = projectId;
        if (!savedProjectId) {
            const project = await createProject(originalTitle, market);
            savedProjectId = project.id;
        } else {
            await updateProject(savedProjectId, { status: 'hook' });
        }

        return { ...result, projectId: savedProjectId };
    } catch (error) {
        console.error('[Error generating hooks]:', error);
        throw error instanceof Error ? error : new Error(String(error));
    }
}