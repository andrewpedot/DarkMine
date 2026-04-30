'use server';

export async function generateThumbPrompt(title: string) {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
        throw new Error('Erro: Chave da Anthropic não encontrada no .env');
    }

    const systemPrompt = `Você é um Diretor de Arte Especialista em YouTube, treinado nos dados científicos de alta conversão do estudo One of 10 e Peter Jordan. O usuário enviará um título. Seu trabalho é criar um prompt de geração de imagem EXTREMAMENTE descritivo, EM INGLÊS, pronto para ser colado no Midjourney ou Nano Banana.

REGRAS DE OURO DA CONVERSÃO (Obrigatórias):

CARGA COGNITIVA ZERO: PROIBIDO QUALQUER TEXTO NA IMAGEM. O prompt não deve conter instruções para escrever na thumbnail. Deixe a imagem contar a história sozinha.

EMOÇÃO E SUJEITOS: Foque no sujeito central com expressão emocional EXTREMA. Quando o contexto permitir, sugira 2, 3 ou 4 rostos reagindo/interagindo (múltiplos rostos geram mais cliques).

CORES E LUZ: Exija uma thumbnail brilhante e de alto contraste. Adicione destaques ou luzes de neon nas cores de alta performance: Ciano (Cyan), Verde Claro (Bright Green), Amarelo ou Laranja. Evite temas predominantemente vermelhos.

ESTRUTURA DO PROMPT: [Sujeito central/Ação com emoção] + [Fundo escuro/desfocado] + [Luz de contorno forte e neon accents] + [Estilo: hyper-realistic, 8k, cinematográfico].

Retorne APENAS o texto do prompt em inglês, sem aspas, sem introduções.`;

    const userMessage = `Título: "${title}"\n\nGere o prompt de imagem.`;

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
                max_tokens: 500,
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
        return data.content[0].text.trim();
    } catch (error) {
        console.error('[Error generating thumb prompt]:', error);
        throw error instanceof Error ? error : new Error(String(error));
    }
}