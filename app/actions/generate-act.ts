'use server';
import { updateProject } from './db';


export async function generateAct(title: string, phaseName: string, previousText: string, narrativeFormat: string, useCulturalAdaptation: boolean, market: string, projectId?: string, currentScriptContent?: any) {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
        throw new Error('Erro: Chave da Anthropic não encontrada no .env');
    }

    const formatInstruction = narrativeFormat === 'Documentário Histórico'
        ? `NÃO escreva como um livro didático. Foque no porquê as pessoas da época achavam que a decisão fazia sentido, o que elas não previram e como uma escolha virou uma bola de neve. Construa a tensão através de causa e efeito, não apenas dramatização.`
        : `Mantenha o tom natural e emocionalmente carregado. Varie o tamanho das frases para controlar o ritmo. Use pensamentos internos, diálogos e imagens vívidas. Acione gatilhos como injustiça, traição ou empatia.`;

    const culturalInstruction = useCulturalAdaptation 
        ? `\nREGRA DE LOCALIZAÇÃO CULTURAL: Este roteiro é uma adaptação de um conteúdo estrangeiro para o mercado: ${market}. Você é estritamente proibido de fazer traduções literais. Você DEVE adaptar o contexto cultural:
- Converta métricas (ex: milhas para km, Fahrenheit para Celsius).
- Adapte analogias esportivas ou marcas hiper-locais americanas para o equivalente cultural do país alvo (ex: trocar referências de beisebol/futebol americano por futebol ou contextos universais).
- Use expressões idiomáticas, gírias e sintaxe natural de um falante nativo do ${market}.
O objetivo é que o espectador sinta que o roteiro foi pensado e escrito originalmente no país dele, mantendo o exato impacto emocional da obra original.` 
        : '';

    const systemPrompt = `Você é um Roteirista Especialista em Retenção de YouTube.
O usuário quer que você escreva APENAS o bloco/ato atual: "${phaseName}".

REGRAS OBRIGATÓRIAS:
1. ATENÇÃO: Sua tarefa é escrever APENAS o ato/bloco solicitado. NÃO gere o roteiro inteiro. NÃO escreva os próximos atos. Foque 100% da sua profundidade e detalhamento apenas neste bloco específico. Seja conciso nas instruções visuais (máximo 10 palavras) para economizar tokens para a locução. Você DEVE fechar o JSON corretamente antes de terminar.
2. O texto será locução direta (voice-over) para um vídeo do YouTube de alta retenção.
3. REGRA DE ESCRITA PARA ÁUDIO: Este roteiro será narrado por uma voz madura para um público que apenas ESCUTA o vídeo enquanto faz outras coisas. Para tornar a narração agradável e imersiva:
- Use frases curtas. Evite parágrafos densos que deixariam o narrador sem fôlego.
- Insira pausas dramáticas naturais usando reticências (...) para dar tempo ao espectador de absorver o impacto da frase.
- Use um tom de voz calmo, sábio, quase como um documentarista clássico da BBC ou um avô contando um segredo na beira da fogueira. Fuja do tom "youtuber eufórico".
- Repita sutilmente nomes ou conceitos importantes ao longo do ato, pois o espectador não pode voltar os olhos para ler o que perdeu.
4. ${formatInstruction}${culturalInstruction}
5. Retorne APENAS um objeto JSON com o "texto" (locução) e "instrucao_visual" (o que aparece na tela).
6. O JSON deve ter o seguinte formato estrito:
{
  "texto": "Aqui vai todo o texto narrado...",
  "instrucao_visual": "Aqui vai o que mostrar na tela (B-Roll, animações, etc.)"
}`;

    let userMessage = `Título do Vídeo: "${title}"\nFase para Escrever: "${phaseName}"\n`;
    if (previousText) {
        userMessage += `\nContexto do Ato Anterior (Continue a partir daqui de forma natural):\n"${previousText}"\n`;
    }
    userMessage += `\nEscreva agora o bloco "${phaseName}" e retorne o JSON.`;

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
                model: 'claude-3-5-sonnet-latest',
                max_tokens: 8192,
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

        if (projectId && currentScriptContent) {
            const updatedRoteiro = currentScriptContent.roteiro.map((block: any) => {
                if (block.fase === phaseName) {
                    return { ...block, texto: result.texto, instrucao_visual: result.instrucao_visual, status: 'concluido' };
                }
                return block;
            });
            const updatedScriptContent = { ...currentScriptContent, roteiro: updatedRoteiro };
            
            await updateProject(projectId, {
                script_content: updatedScriptContent
            });
        }

        return result;
    } catch (error) {
        console.error('[Error generating act]:', error);
        throw new Error('A IA gerou texto demais e cortou o resultado. Tente gerar este ato novamente.');
    }
}
