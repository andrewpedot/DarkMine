'use server';

export const maxDuration = 60;
export const runtime = 'edge';

export async function analyzeMarketKeywords(title: string, marketLabel: string, lang: string) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw new Error('Chave da Anthropic não encontrada.');
    }

    const systemPrompt = `Você é um analista de dados rigoroso e cético especializado em SEO de YouTube.
NUNCA declare um mercado como 'Oceano Azul' ou 'Sem Concorrência' apenas porque o título foi traduzido para outro idioma (como espanhol ou inglês).
Assuma por padrão que nichos de relaxamento e curiosidades já possuem grandes players nos idiomas principais.
Sempre recomende que o usuário faça uma busca manual no YouTube no modo anônimo para confirmar o volume de views.

Sua tarefa: O usuário enviará um título de vídeo em inglês e o mercado alvo.
1. Identifique o tema central do vídeo.
2. Extraia apenas as 2 ou 3 palavras-chave MAIS IMPORTANTES desse tema. Não use o título completo.
3. Traduza APENAS essas 2 ou 3 palavras-chave para o idioma do mercado alvo (${marketLabel} - código ${lang}).
4. Gere uma breve análise textual (2-3 frases) sobre a provável concorrência desse tema no mercado alvo, adotando a postura cética exigida.

Retorne EXATAMENTE este formato JSON válido e nada mais:
{
  "keywords": "palavra1 palavra2",
  "analise_textual": "Sua análise rigorosa aqui..."
}`;

    const userMessage = `Título: "${title}"\nMercado Alvo: ${marketLabel} (${lang})`;

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
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

        const result = JSON.parse(content.trim());
        return result;
    } catch (error) {
        console.error('[Error in analyzeMarketKeywords]:', error);
        throw error instanceof Error ? error : new Error(String(error));
    }
}
