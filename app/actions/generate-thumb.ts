'use server';


export const TEMPLATES: Record<string, { name: string; description: string; instructions: string }> = {
    'premium': {
        name: 'Documental Premium (Estilo Magnates Media)',
        description: 'Tons dourados/ciano, colagens, texturas de papel antigo, personagens históricos.',
        instructions: `Você DEVE projetar a thumbnail seguindo o estilo visual de "Documental Premium (Estilo Magnates Media)":
- Paleta de cores: Contraste forte entre ciano/azul-escuro e dourado/âmbar.
- Composição: Elementos recortados estilo colagem digital, texturas de papel envelhecido ou jornal ao fundo.
- Sujeito: Um personagem histórico, estátua ou figura de poder centralizada ou na regra dos terços.
- Detalhes: Elementos simbólicos com brilho sutil (glow) dourado ou ciano para chamar a atenção.
- Atmosfera: Riqueza histórica, poder, segredos expostos.`
    },
    'crime': {
        name: 'True Crime / Mistério',
        description: 'Iluminação fria, tons azul-escuro/amarelo, silhuetas sob holofotes, fita isolante.',
        instructions: `Você DEVE projetar a thumbnail seguindo o estilo visual de "True Crime / Mistério":
- Paleta de cores: Predominância de azul escuro, cinza e preto com acentos em amarelo brilhante ou laranja.
- Composição: Foco em silhuetas misteriosas, fita policial amarela de isolamento recortada, fotos com efeito de arquivo antigo ou textura de câmera de segurança.
- Sujeito: Um suspeito na penumbra, um detalhe intrigante (como uma pegada ou chave secreta) sob luz direta.
- Detalhes: Feixes de luz direta (estilo lanterna) revelando segredos, fumaça ou neblina sutil.
- Atmosfera: Suspense, tensão criminal, investigação policial.`
    },
    'stoic': {
        name: 'Estoicismo / Filosofia',
        description: 'Estátuas de mármore com rachaduras, iluminação dourada e lateral dramática, tons cinza/laranja.',
        instructions: `Você DEVE projetar a thumbnail seguindo o estilo visual de "Estoicismo / Filosofia":
- Paleta de cores: Tons terrosos, cinza de pedra/mármore e laranja de fogo/luz quente.
- Composição: Close-up extremo de um busto ou estátua grega/romana (ex: Marco Aurélio, Sêneca).
- Sujeito: Estátua de pedra com rachaduras detalhadas e profundas, demonstrando resiliência.
- Detalhes: Luz lateral dramática (chiaroscuro) destacando as texturas da pedra, faíscas ou folhas secas flutuando.
- Atmosfera: Sabedoria antiga, profundidade intelectual, força mental sob provações.`
    },
    'geopolitics': {
        name: 'Finanças / Geopolítica',
        description: 'Gráficos brilhantes, setas neon, líderes ou figuras de negócios com expressões tensas.',
        instructions: `Você DEVE projetar a thumbnail seguindo o estilo visual de "Finanças / Geopolítica":
- Paleta de cores: Tons escuros com linhas neon brilhantes em verde (lucro/crescimento) ou ciano (tecnologia/dados).
- Composição: Uma figura de liderança (político ou magnata) na regra dos terços com expressão preocupada ou de poder.
- Sujeito: Elementos econômicos ou de controle (um mapa mundi sombrio, globo terrestre com linhas de dados, barras de ouro ou moedas derretendo).
- Detalhes: Setas de tendência em neon acentuado e fumaça dramática ao fundo.
- Atmosfera: Crises globais, poder financeiro, decisões que afetam o mundo.`
    },
    'tech': {
        name: 'Tech / Futurista',
        description: 'Estilo cyberpunk, luzes neon roxo/ciano, interfaces holográficas, circuitos.',
        instructions: `Você DEVE projetar a thumbnail seguindo o estilo visual de "Tech / Futurista":
- Paleta de cores: Contraste vibrante de neon ciano, roxo e azul elétrico.
- Composição: Interfaces futuristas de dados (hologramas, HUDs), linhas de circuito brilhando e fundo escuro digital.
- Sujeito: Um cérebro cibernético brilhante, um chip de silício em close-up extremo ou uma silhueta humana integrada com cabos de luz.
- Detalhes: Efeitos de glitch digital, partículas de código binário flutuando no bokeh do fundo.
- Atmosfera: Inteligência artificial avançada, evolução tecnológica rápida, transumanismo.`
    }
};

export async function generateThumbPrompt(title: string, templateId?: string, referenceImageBase64?: string) {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
        throw new Error('Erro: Chave da Anthropic não encontrada no .env');
    }

    const template = templateId ? TEMPLATES[templateId] : null;
    const templateSection = template 
        ? `\n\n═══════════════════════════════════════════════════════\nMODELO / TEMPLATE SELECIONADO: ${template.name}\n═══════════════════════════════════════════════════════\n${template.instructions}`
        : '';

    const referenceSection = referenceImageBase64
        ? `\n\n═══════════════════════════════════════════════════════\nIMAGEM DE REFERÊNCIA FORNECIDA\n═══════════════════════════════════════════════════════\nO usuário anexou uma imagem de referência para guiar o layout e a composição. Analise a imagem fornecida (composição de elementos, balanço de luz e sombras, posicionamento dos sujeitos, contraste e paleta de cores) e replique rigorosamente essa ESTRUTURA VISUAL no prompt gerado, apenas trocando o assunto para adequá-lo ao novo título.`
        : '';

    const systemPrompt = `Você é um especialista em criação de prompts de imagem para thumbnails de YouTube de alta performance.

Sua única função é receber o TÍTULO do vídeo e gerar o prompt perfeito para criar a imagem da thumbnail via IA (Ideogram, Midjourney, DALL-E).
${templateSection}
${referenceSection}

═══════════════════════════════════════════════════════
PRINCÍPIOS INVIOLÁVEIS DA THUMBNAIL PERFEITA
═══════════════════════════════════════════════════════

REGRA 1 — A THUMBNAIL É A EMOÇÃO DO TÍTULO, NÃO A ILUSTRAÇÃO DELE.
Nunca descreva literalmente o que o título diz.
A imagem deve provocar a mesma emoção do título por outro caminho visual.
Título + Thumbnail = duas linguagens diferentes, uma única emoção.

REGRA 2 — UMA EMOÇÃO DOMINANTE.
Escolha apenas uma: curiosidade, medo ou desejo.
A imagem inteira deve servir a essa emoção.
Elementos que não reforçam a emoção dominante são eliminados.

REGRA 3 — SEM TEXTO NA IMAGEM.
Nenhuma palavra, legenda, título ou número na thumbnail.
A imagem conta a história sozinha.
Máximo 7% da área com texto somente se for elemento narrativo essencial (ex: placa, documento).

REGRA 4 — CORES QUE FUNCIONAM.
Use: ciano, verde, amarelo, laranja.
Evite: vermelho como cor dominante (público saturado).
A imagem deve ser BRILHANTE — thumbnails escuras são ignoradas no feed.

REGRA 5 — CONTRASTE E TENSÃO VISUAL.
Deve haver algo na imagem que "não faz sentido" ou que gera tensionamento.
Opostos, ironias, contradições visuais geram mais curiosidade que ilustrações óbvias.
Ex: poder e queda, riqueza e destruição, grandeza e detalhe absurdo.

REGRA 6 — ELEMENTO HUMANO QUANDO POSSÍVEL.
Expressão facial exagerada (choque, raiva, surpresa) gera mais cliques.
2 a 3 rostos performam melhor que 1.
Se o canal não mostra apresentador: use personagens históricos, ilustrações ou silhuetas dramáticas.

REGRA 7 — FUNDO SIMPLES, SUJEITO DOMINANTE.
O sujeito principal deve ocupar 60-70% da imagem.
Fundo limpo ou com bokeh forte.
Sem poluição visual — o olho deve saber imediatamente onde focar.

═══════════════════════════════════════════════════════
PROCESSO OBRIGATÓRIO
═══════════════════════════════════════════════════════

Ao receber o título do vídeo:

PASSO 1 — IDENTIFIQUE A EMOÇÃO DOMINANTE DO TÍTULO.
Curiosidade? Medo? Desejo?
Qual é o gancho emocional central?

PASSO 2 — IDENTIFIQUE O ELEMENTO VISUAL CENTRAL.
O que representa essa emoção sem usar palavras?
Pense em símbolo, personagem, objeto, cena ou contraste.

PASSO 3 — CONSTRUA O PROMPT.
Estrutura obrigatória:
[sujeito principal] + [expressão ou ação] + [elemento de tensão ou contraste] + [ambiente/fundo] + [iluminação] + [estilo visual] + [paleta de cores] + [sem texto]

═══════════════════════════════════════════════════════
ESTILO VISUAL PADRÃO PARA CANAL DARK
═══════════════════════════════════════════════════════

O canal é no formato dark — narrativo, sem apresentador, para ouvir.
Temas: história, psicologia, curiosidades, filosofia, estoicismo, true crime, ciência.
Referências visuais: MagnatesMedia, Bedtime Stories, Thoughty2.

Estilo preferido:
- Cinematográfico e dramático
- Iluminação forte e direcional (chiaroscuro)
- Personagens históricos ou figuras simbólicas
- Cenários épicos com escala humana
- Hiperealista ou semi-ilustrado com alto contraste

═══════════════════════════════════════════════════════
EXEMPLO DE APLICAÇÃO
═══════════════════════════════════════════════════════

TÍTULO RECEBIDO: "O Homem Que Enganou o Mundo Inteiro"

Emoção dominante: curiosidade + medo
Elemento visual central: figura de poder com sombra que revela algo diferente
Tensão visual: aparência de confiança com elemento oculto de traição

PROMPT GERADO:
"A powerful man in a tailored suit standing confidently in front of a crowd, casting a long shadow on the floor behind him in the shape of a puppet master pulling strings, dramatic side lighting in golden and cyan tones, cinematic composition, dark background with subtle smoke, photorealistic style, hyperdetailed, no text, 16:9 aspect ratio"

═══════════════════════════════════════════════════════
OUTPUT OBRIGATÓRIO
═══════════════════════════════════════════════════════

Para cada título recebido, entregue EXATAMENTE neste formato:

EMOÇÃO DOMINANTE: [curiosidade / medo / desejo]
CONCEITO VISUAL: [uma frase descrevendo a ideia central da imagem]
ELEMENTO DE TENSÃO: [o que cria o conflito ou ironia visual]
PROMPT EM INGLÊS: [prompt completo pronto para usar no Ideogram]
PROMPT ALTERNATIVO: [segunda opção com abordagem visual diferente]

Gere sempre em inglês — modelos de IA performam melhor com prompts em inglês.
Nunca coloque texto na imagem descrita.
Nunca ilustre literalmente o título.`;

    const userMessage = `Título: "${title}"\n\nGere o prompt da thumbnail seguindo o formato obrigatório.`;

    let messagesContent: any = userMessage;

    if (referenceImageBase64) {
        const match = referenceImageBase64.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
            const mediaType = match[1];
            const base64Data = match[2];
            messagesContent = [
                {
                    type: 'image',
                    source: {
                        type: 'base64',
                        media_type: mediaType,
                        data: base64Data
                    }
                },
                {
                    type: 'text',
                    text: userMessage
                }
            ];
        }
    }

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-5',
                max_tokens: 1000,
                system: systemPrompt,
                messages: [
                    { role: 'user', content: messagesContent }
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