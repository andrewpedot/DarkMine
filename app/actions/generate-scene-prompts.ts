'use server';


export async function generateScenePrompts(sceneText: string) {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
        throw new Error('Erro: Chave da Anthropic não encontrada no .env');
    }

    const systemPrompt = `Você é um Diretor de Fotografia de YouTube. O usuário enviará um trecho de roteiro. Sua tarefa é extrair 2 a 3 cenas chave desse texto e criar prompts de imagens hiper-realistas para o Nano Banana / Midjourney.

REGRAS:
- Os prompts DEVEM SER EM INGLÊS.
- Proibido texto nas imagens.
- Estilo visual: Cinematic, dark documentary style, highly detailed, dramatic lighting.
- Retorne um JSON válido com um array de strings chamado 'prompts'.`;

    const userMessage = sceneText;

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

        return JSON.parse(content.trim());
    } catch (error) {
        console.error('[Error generating scene prompts]:', error);
        throw error instanceof Error ? error : new Error(String(error));
    }
}