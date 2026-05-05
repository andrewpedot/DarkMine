'use server';
import { createProject, updateProject } from './db';


export async function generateHooks(originalTitle: string, market: string, projectId?: string) {
    try {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        
        if (!apiKey) {
            console.error('ANTHROPIC_API_KEY is missing');
            return { success: false, error: 'Erro: Chave da Anthropic não encontrada.' };
        }

        console.log(`Generating hooks for: ${originalTitle} in market: ${market}`);

        const systemPrompt = `Você é um Master Copywriter de YouTube especializado em localização. O usuário enviará um título outlier em inglês e o mercado alvo. Seu objetivo NÃO é traduzir literalmente, mas criar um Clone Cultural que mantenha o exato gatilho psicológico e o contexto original, usando gírias e a sintaxe natural do idioma escolhido. Retorne APENAS um JSON válido.
        
        JSON STRUCTURE:
        {
          "analise_psicologica": "Análise do gatilho viral",
          "variacoes": [
            { "titulo": "Clone Cultural Fiel", "emocao": "Clone Exato", "ctr_estimado": 99 },
            { "titulo": "Opção B", "emocao": "Curiosidade", "ctr_estimado": 95 },
            { "titulo": "Opção C", "emocao": "Urgência", "ctr_estimado": 90 }
          ]
        }`;

        const userMessage = `Título Original: "${originalTitle}"\nMercado Alvo: ${market}\n\nGere o clone cultural em formato JSON respeitando rigorosamente as regras. NÃO TRADUZA AS CHAVES DO JSON.`;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 1024,
                system: systemPrompt,
                messages: [{ role: 'user', content: userMessage }]
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('[Anthropic Error]:', errorBody);
            return { success: false, error: `Erro na API da Anthropic: ${response.status}` };
        }

        const data = await response.json();
        
        if (!data.content || !data.content[0] || !data.content[0].text) {
            console.error('Invalid response structure from Anthropic:', data);
            return { success: false, error: 'Resposta inválida da IA.' };
        }

        let content = data.content[0].text.trim();
        
        // Extract JSON from potential markdown or text
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            content = jsonMatch[0];
        }

        let result;
        try {
            result = JSON.parse(content);
        } catch (e) {
            console.error('Failed to parse JSON content:', content);
            return { success: false, error: 'Erro ao processar o JSON gerado pela IA.' };
        }

        // Normalize keys
        if (result.variacoes && Array.isArray(result.variacoes)) {
            result.variacoes = result.variacoes.map((v: any) => ({
                titulo: v.titulo || v.title || v.titre || v.título || '',
                emocao: v.emocao || v.emotion || v.emoção || '',
                ctr_estimado: v.ctr_estimado || v.estimated_ctr || v.ctr || 95
            }));
        }

        let savedProjectId = projectId;
        try {
            if (!savedProjectId) {
                const project = await createProject(originalTitle, market);
                savedProjectId = project.id;
            } else {
                await updateProject(savedProjectId, { status: 'hook' });
            }
        } catch (dbError) {
            console.error('[Database Error]:', dbError);
            // We still return results even if DB fails, but we won't have a projectId
        }

        return { success: true, ...result, projectId: savedProjectId };

    } catch (error: any) {
        console.error('[Error in generateHooks]:', error);
        return { success: false, error: error.message || 'Erro interno desconhecido.' };
    }
}