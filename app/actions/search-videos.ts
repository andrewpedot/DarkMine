'use server';

// Headers to bypass Google API key HTTP Referrer restriction when called server-side
const YT_HEADERS = {
  'Referer': 'https://www.darkmine.fun/',
  'Origin': 'https://www.darkmine.fun',
};

// ─────────────────────────────────────────────────────────────────────────────
// HEURÍSTICAS DE DETECÇÃO DE CANAL DARK / FACELESS
// A propriedade containsSyntheticMedia é raramente preenchida pelos criadores,
// então usamos sinais indiretos muito mais confiáveis.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sinal 1 — Regex de título Dark/Faceless (filtro NEGATIVO + POSITIVO)
 * Negativo: elimina conteúdo de face visível ("eu", "minha vida", "vlog", etc.)
 * Positivo: detecta padrões típicos de copywriting dark (documentário, mistério, teoria)
 */
const REGEX_FACE_VISIBLE = /\b(eu|meu|minha|vlog|podcast|tour|unboxing|reagindo|react|q&a|qna|storytime|story time|mukbang|get ready with me|grwm|haul|day in my life)\b/i;

// Palavras-chave de títulos dark/faceless — cada match adiciona pontos ao score
const DARK_TITLE_KEYWORDS = [
  /\b(secret|hidden|exposed|untold|truth|shocking|revealed|conspiracy|dark|disturbing|mystery|unsolved|crime|murder|killed|disappeared|missing|cover.?up|forbidden|classified)\b/i,
  /\b(documentary|investigation|case|story|history|footage|evidence|caught|arrested|sentenced|executed|verdict)\b/i,
  /\b(billionaire|millionaire|empire|scheme|scam|fraud|heist|scandal|downfall|rise and fall)\b/i,
  /\b(psychology|manipulation|control|narcissist|sociopath|psychopath|dark side|mind|experiment)\b/i,
];

/**
 * Sinal 2 — Perfil de canal Dark/Faceless
 * Canais faceless tendem a ter:
 * - Poucos vídeos mas alta média de views por vídeo (conteúdo de nicho altamente editado)
 * - Nome genérico sem nome de pessoa
 * - Canal criado recentemente (< 5 anos) mas com muitas views totais
 */
const REGEX_PERSON_NAME_IN_CHANNEL = /\b(official|tv$|channel$)|\b[A-Z][a-z]+ [A-Z][a-z]+\b/;

function scoreFacelessChannel(channel: any, video: any): number {
  let score = 0;

  const videoCount = parseInt(channel.statistics?.videoCount || '0', 10);
  const totalChannelViews = parseInt(channel.statistics?.viewCount || '0', 10);
  const subsRaw = parseInt(channel.statistics?.subscriberCount || '0', 10);
  const channelTitle: string = channel.snippet?.title || '';
  const videoTitle: string = video.snippet?.title || '';
  const channelDescription: string = channel.snippet?.description || '';

  // Sinal 2a: Alta média de views por vídeo — conteúdo de alto valor, não vlogs diários
  // Canais Dark/Faceless: poucos vídeos, cada um viraliza
  const avgViewsPerVideo = videoCount > 0 ? totalChannelViews / videoCount : 0;
  if (avgViewsPerVideo > 500_000) score += 40;       // Canal de elite dark
  else if (avgViewsPerVideo > 200_000) score += 30;  // Canal dark estabelecido
  else if (avgViewsPerVideo > 50_000) score += 20;   // Canal dark emergente
  else if (avgViewsPerVideo > 10_000) score += 10;   // Canal em crescimento

  // Sinal 2b: Poucos vídeos mas muitos inscritos = qualidade > quantidade (faceless)
  if (videoCount < 50 && subsRaw > 10_000) score += 20;
  else if (videoCount < 100 && subsRaw > 20_000) score += 15;
  else if (videoCount < 200) score += 10;

  // Sinal 2c: Nome do canal NÃO parece nome de pessoa (ex: "John Smith" = -20)
  // Canais dark usam nomes temáticos: "CrimeDark", "ShadowEconomy", "TrueStories"
  const channelWords = channelTitle.split(' ');
  const looksLikePersonName = channelWords.length === 2 &&
    channelWords.every(w => /^[A-Z][a-z]+$/.test(w)) &&
    !['True', 'Dark', 'Crime', 'Story', 'Real', 'Cold', 'Deep', 'Black', 'Dead', 'Lost'].includes(channelWords[0]);
  if (!looksLikePersonName) score += 15;

  // Sinal 2d: Descrição do canal NÃO tem pronomes pessoais fortes
  const personalDesc = /\b(I am|I'm|my name is|hi, I'm|hello, I'm|sou eu|meu nome é)\b/i.test(channelDescription);
  if (!personalDesc) score += 10;

  // Sinal 1 (positivo): Título com copywriting dark
  let darkTitleMatches = 0;
  for (const regex of DARK_TITLE_KEYWORDS) {
    if (regex.test(videoTitle)) darkTitleMatches++;
  }
  score += darkTitleMatches * 15; // Até +60 pontos

  // Sinal 3: containsSyntheticMedia confirmado (bônus máximo quando disponível)
  if (video.status?.containsSyntheticMedia === true) score += 50;

  return score;
}

export async function searchVideos(query: string, maxSubs: number, niche: string) {
  const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("Chave de API do YouTube não configurada.");
  }

  // 1. Pesquisa — últimos 6 meses para ter volume suficiente
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const publishedAfterStr = sixMonthsAgo.toISOString();

  let allSearchItems: any[] = [];
  let nextPageToken = '';

  for (let i = 0; i < 2; i++) {
    const pageTokenParam = nextPageToken ? `&pageToken=${nextPageToken}` : '';
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=50&q=${encodeURIComponent(query)}&type=video&regionCode=US&relevanceLanguage=en&publishedAfter=${publishedAfterStr}${pageTokenParam}&key=${apiKey}`,
      { headers: YT_HEADERS }
    );
    const searchData = await searchRes.json();
    if (searchData.error) {
      if (i === 0) throw new Error(searchData.error.message);
      break;
    }
    if (searchData.items) allSearchItems.push(...searchData.items);
    nextPageToken = searchData.nextPageToken;
    if (!nextPageToken) break;
  }

  if (allSearchItems.length === 0) return [];

  const videoIdsArr = allSearchItems.map((item: any) => item.id.videoId).filter(Boolean);
  const channelIdsArr = Array.from(new Set(allSearchItems.map((item: any) => item.snippet.channelId).filter(Boolean))) as string[];

  if (videoIdsArr.length === 0) return [];

  // 2. Obter estatísticas dos vídeos (com status para detectar IA)
  let allVideosData: any[] = [];
  for (let i = 0; i < videoIdsArr.length; i += 50) {
    const batch = videoIdsArr.slice(i, i + 50).join(',');
    const videosRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet,status&id=${batch}&key=${apiKey}`,
      { headers: YT_HEADERS }
    );
    const videosData = await videosRes.json();
    if (videosData.items) allVideosData.push(...videosData.items);
  }

  // 3. Obter estatísticas + descrição dos canais
  let allChannelsData: any[] = [];
  for (let i = 0; i < channelIdsArr.length; i += 50) {
    const batch = channelIdsArr.slice(i, i + 50).join(',');
    const channelsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${batch}&key=${apiKey}`,
      { headers: YT_HEADERS }
    );
    const channelsData = await channelsRes.json();
    if (channelsData.items) allChannelsData.push(...channelsData.items);
  }

  const now = new Date();
  const results: any[] = [];

  for (const video of allVideosData) {
    const channel = allChannelsData.find((c: any) => c.id === video.snippet.channelId);
    if (!channel) continue;

    const videoTitle: string = video.snippet?.title || '';

    // ── Filtro NEGATIVO obrigatório: descarta face visível ──
    if (REGEX_FACE_VISIBLE.test(videoTitle)) continue;

    // ── Filtro de inscritos ──
    const subsRaw = parseInt(channel.statistics?.subscriberCount || '0', 10);
    if (subsRaw > maxSubs) continue;

    // ── Cálculo de Recência e VPD ──
    const publishedAt = new Date(video.snippet.publishedAt);
    let ageInDays = Math.ceil((now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60 * 24));
    if (ageInDays < 1) ageInDays = 1;

    if (ageInDays > 180) continue;

    const viewsRaw = parseInt(video.statistics?.viewCount || '0', 10);
    const viewsPerDay = Math.floor(viewsRaw / ageInDays);

    if (viewsPerDay < 200) continue;

    // ── Regra de Anomalia (Outlier) ──
    const outlierMultiplier = subsRaw > 0 ? Number((viewsRaw / subsRaw).toFixed(2)) : 0;
    if (outlierMultiplier < 1) continue;

    // ── Score de Dark/Faceless (heurísticas indiretas) ──
    const facelessScore = scoreFacelessChannel(channel, video);

    // Threshold mínimo: score >= 20 para ser considerado canal dark/faceless
    // (= qualquer combinação de sinais positivos, não precisa de containsSyntheticMedia)
    if (facelessScore < 20) continue;

    const isSynthetic = video.status?.containsSyntheticMedia === true;

    results.push({
      id: video.id,
      title: videoTitle,
      channel: channel.snippet.title,
      channelUrl: `https://www.youtube.com/channel/${channel.id}`,
      subscribers: subsRaw,
      views: viewsRaw,
      publishedAt: publishedAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
      outlierMultiplier,
      viewsPerDay,
      facelessScore,
      thumbnailUrl:
        video.snippet.thumbnails?.maxres?.url ||
        video.snippet.thumbnails?.high?.url ||
        video.snippet.thumbnails?.medium?.url ||
        '',
      videoUrl: `https://www.youtube.com/watch?v=${video.id}`,
      syntheticMedia: isSynthetic,
    });
  }

  // Ordenar pelo maior facelessScore × outlierMultiplier (melhor canal dark + maior anomalia)
  return results
    .sort((a, b) => (b.facelessScore * b.outlierMultiplier) - (a.facelessScore * a.outlierMultiplier))
    .slice(0, 20);
}
