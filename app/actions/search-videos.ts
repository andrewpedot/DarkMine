'use server';

// Headers to bypass Google API key HTTP Referrer restriction when called server-side
const YT_HEADERS = {
  'Referer': 'https://www.darkmine.fun/',
  'Origin': 'https://www.darkmine.fun',
};

// ─────────────────────────────────────────────────────────────────────────────
// MAPEAMENTO: Nicho → YouTube videoCategoryId
// Usado no chart=mostPopular para filtrar por categoria no servidor.
// Documentação: https://developers.google.com/youtube/v3/docs/videoCategories
// ─────────────────────────────────────────────────────────────────────────────
const NICHE_CATEGORY: Record<string, string> = {
  'Finanças':       '25', // News & Politics
  'True Crime':     '25', // News & Politics
  'Geopolítica':    '25', // News & Politics
  'Tech':           '28', // Science & Technology
  'Espaço/Ciência': '28', // Science & Technology
  'História':       '27', // Education
  'Psicologia':     '27', // Education
  'Estoicismo':     '27', // Education
};

// ─────────────────────────────────────────────────────────────────────────────
// QUERY PADRÃO POR NICHO — usada quando o usuário não digita nada.
// Frases de copywriting dark/faceless que performam bem em cada nicho.
// order=viewCount garante que os vídeos mais assistidos do período apareçam.
// ─────────────────────────────────────────────────────────────────────────────
const NICHE_DEFAULT_QUERY: Record<string, string> = {
  'Finanças':       'financial scandal exposed billionaire scheme money fraud',
  'True Crime':     'unsolved murder disappearance crime case investigation truth',
  'Tech':           'technology dark side secret exposed algorithm surveillance',
  'História':       'hidden history untold story secret civilization disturbing truth',
  'Psicologia':     'psychology manipulation control dark narcissist mind experiment',
  'Geopolítica':    'government classified secret conspiracy geopolitics exposed',
  'Estoicismo':     'stoicism philosophy truth dark side forbidden wisdom',
  'Espaço/Ciência': 'space mystery universe dark secret discovered nasa classified',
  'Todos':          'documentary mystery exposed truth dark secret conspiracy untold',
};

// ─────────────────────────────────────────────────────────────────────────────
// REGEX — filtros de título
// ─────────────────────────────────────────────────────────────────────────────
const REGEX_FACE_VISIBLE = /\b(vlog|podcast|unboxing|react|q&a|qna|storytime|story time|mukbang|get ready with me|grwm|haul|day in my life|watch me|my life|my story|my reaction|i tried|i spent|challenge|with me)\b/i;
const REGEX_SHORTS = /#shorts?\b|\bshorts?\b$/i;

// Palavras-chave positivas de títulos dark/faceless
const DARK_TITLE_KEYWORDS = [
  /\b(secret|hidden|exposed|untold|truth|shocking|revealed|conspiracy|dark|disturbing|mystery|unsolved|crime|murder|killed|disappeared|missing|cover.?up|forbidden|classified)\b/i,
  /\b(documentary|investigation|case|story|history|footage|evidence|caught|arrested|sentenced|executed|verdict)\b/i,
  /\b(billionaire|millionaire|empire|scheme|scam|fraud|heist|scandal|downfall|rise and fall)\b/i,
  /\b(psychology|manipulation|control|narcissist|sociopath|psychopath|dark side|mind|experiment)\b/i,
];

// ─────────────────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────────────────
function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return parseInt(match[1] || '0') * 3600 + parseInt(match[2] || '0') * 60 + parseInt(match[3] || '0');
}

function formatSubsDisplay(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

function formatViewsDisplay(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

function formatVph(vph: number): string {
  if (vph >= 1_000) return (vph / 1_000).toFixed(1) + 'K';
  return vph.toString();
}

function getThumbnailType(_score: number, title: string): string {
  const t = title.toLowerCase();
  if (/finance|money|invest|billionaire|wealth|scheme|scam|fraud/.test(t)) return 'finance';
  if (/crime|murder|killed|disappeared|missing|sentenced|verdict|arrest/.test(t)) return 'crime';
  if (/tech|ai|robot|algorithm|hack|cyber|software|computer/.test(t)) return 'tech';
  if (/psychology|mind|manipulation|narcissist|experiment|behavior/.test(t)) return 'psychology';
  if (/war|geopolit|empire|government|nation|military|conflict/.test(t)) return 'geopolitics';
  if (/space|universe|nasa|galaxy|planet|cosmos|astronomy/.test(t)) return 'space';
  return 'default';
}

function detectNiche(title: string): string {
  const t = title.toLowerCase();
  if (/finance|money|invest|billionaire|wealth|scam|fraud/.test(t)) return 'Finanças';
  if (/crime|murder|killed|disappeared|missing|sentenced|verdict/.test(t)) return 'True Crime';
  if (/tech|ai|robot|algorithm|hack|cyber/.test(t)) return 'Tech';
  if (/psychology|mind|manipulation|narcissist/.test(t)) return 'Psicologia';
  if (/war|geopolit|government|military|nation/.test(t)) return 'Geopolítica';
  if (/space|universe|nasa|galaxy|planet/.test(t)) return 'Espaço/Ciência';
  if (/history|ancient|century|civilization/.test(t)) return 'História';
  return 'Outros';
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORE DE FACELESS
// ─────────────────────────────────────────────────────────────────────────────
function scoreFacelessChannel(channel: any, video: any): number {
  let score = 0;

  const videoCount = parseInt(channel.statistics?.videoCount || '0', 10);
  const totalChannelViews = parseInt(channel.statistics?.viewCount || '0', 10);
  const subsRaw = parseInt(channel.statistics?.subscriberCount || '0', 10);
  const channelTitle: string = channel.snippet?.title || '';
  const videoTitle: string = video.snippet?.title || '';
  const channelDescription: string = channel.snippet?.description || '';

  // Sinal A: Alta média de views por vídeo (conteúdo viral, não daily vlog)
  const avgViewsPerVideo = videoCount > 0 ? totalChannelViews / videoCount : 0;
  if (avgViewsPerVideo > 500_000) score += 40;
  else if (avgViewsPerVideo > 200_000) score += 30;
  else if (avgViewsPerVideo > 50_000) score += 20;
  else if (avgViewsPerVideo > 10_000) score += 10;

  // Sinal B: Poucos vídeos mas muitos inscritos
  if (videoCount < 50 && subsRaw > 10_000) score += 20;
  else if (videoCount < 100 && subsRaw > 20_000) score += 15;
  else if (videoCount < 200) score += 10;

  // Sinal C: Nome do canal NÃO parece nome de pessoa
  const channelWords = channelTitle.split(' ');
  const looksLikePersonName = channelWords.length === 2 &&
    channelWords.every(w => /^[A-Z][a-z]+$/.test(w)) &&
    !['True', 'Dark', 'Crime', 'Story', 'Real', 'Cold', 'Deep', 'Black', 'Dead', 'Lost', 'Dark', 'Shadow', 'Hidden'].includes(channelWords[0]);
  if (!looksLikePersonName) score += 15;

  // Sinal D: Descrição sem pronomes pessoais
  const personalDesc = /\b(I am|I'm|my name is|hi, I'm|hello, I'm)\b/i.test(channelDescription);
  if (!personalDesc) score += 10;

  // Sinal E: Palavras-chave dark no título
  let darkMatches = 0;
  for (const re of DARK_TITLE_KEYWORDS) {
    if (re.test(videoTitle)) darkMatches++;
  }
  score += darkMatches * 15; // até +60

  // Sinal F: IA declarada (bônus máximo quando disponível)
  if (video.status?.containsSyntheticMedia === true) score += 50;

  return score;
}

// ─────────────────────────────────────────────────────────────────────────────
// FONTE 1 — chart=mostPopular (O QUE O YOUTUBE ESTÁ PROMOVENDO AGORA)
// Custo: 1 unidade por 50 vídeos — MUITO mais barato que search (100 unidades)
// Retorna vídeos completos (snippet + statistics + contentDetails + status)
// ─────────────────────────────────────────────────────────────────────────────
async function fetchMostPopular(apiKey: string, categoryId?: string): Promise<any[]> {
  const items: any[] = [];
  let pageToken = '';

  // 4 páginas × 50 = 200 vídeos — custo total: ~4 unidades
  for (let i = 0; i < 4; i++) {
    const params = new URLSearchParams({
      part: 'snippet,statistics,contentDetails,status',
      chart: 'mostPopular',
      regionCode: 'US',
      maxResults: '50',
      key: apiKey,
    });
    if (categoryId) params.set('videoCategoryId', categoryId);
    if (pageToken) params.set('pageToken', pageToken);

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${params}`,
      { headers: YT_HEADERS }
    );
    const data = await res.json();
    if (data.error || !data.items?.length) break;
    items.push(...data.items);
    pageToken = data.nextPageToken || '';
    if (!pageToken) break;
  }

  return items;
}

// ─────────────────────────────────────────────────────────────────────────────
// FONTE 2 — search por keyword (BUSCA POR NICHO ESPECÍFICO)
// Custo: 100 unidades/página — caro mas necessário para nichos específicos.
// order=viewCount: retorna os vídeos MAIS ASSISTIDOS do período (não por relevância).
// Isso encontra canais pequenos com views altas = sinal que o algoritmo está empurrando.
// ─────────────────────────────────────────────────────────────────────────────
async function fetchByKeyword(apiKey: string, query: string, publishedAfterDays = 90): Promise<any[]> {
  const after = new Date();
  after.setDate(after.getDate() - publishedAfterDays);

  // Etapa 1: search → retorna só snippet + videoId
  const searchItems: any[] = [];
  let pageToken = '';

  for (let i = 0; i < 2; i++) {
    const params = new URLSearchParams({
      part: 'snippet',
      maxResults: '50',
      q: query,
      type: 'video',
      regionCode: 'US',
      relevanceLanguage: 'en',
      order: 'viewCount',           // ← Mais assistidos primeiro (não relevância)
      publishedAfter: after.toISOString(),
      key: apiKey,
    });
    if (pageToken) params.set('pageToken', pageToken);

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params}`,
      { headers: YT_HEADERS }
    );
    const data = await res.json();
    if (data.error) {
      if (i === 0) throw new Error(data.error.message);
      break;
    }
    if (data.items) searchItems.push(...data.items);
    pageToken = data.nextPageToken || '';
    if (!pageToken) break;
  }

  if (searchItems.length === 0) return [];

  // Etapa 2: videos → estatísticas completas (search não retorna statistics)
  const videoIds = searchItems.map((i: any) => i.id?.videoId).filter(Boolean);
  const videos: any[] = [];

  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50).join(',');
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails,status&id=${batch}&key=${apiKey}`,
      { headers: YT_HEADERS }
    );
    const data = await res.json();
    if (data.items) videos.push(...data.items);
  }

  return videos;
}

// ─────────────────────────────────────────────────────────────────────────────
// CANAIS — busca detalhes de uma lista de IDs
// ─────────────────────────────────────────────────────────────────────────────
async function fetchChannels(apiKey: string, channelIds: string[]): Promise<Map<string, any>> {
  const map = new Map<string, any>();
  for (let i = 0; i < channelIds.length; i += 50) {
    const batch = channelIds.slice(i, i + 50).join(',');
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${batch}&key=${apiKey}`,
      { headers: YT_HEADERS }
    );
    const data = await res.json();
    for (const ch of data.items || []) {
      map.set(ch.id, ch);
    }
  }
  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTRO + SCORE — lógica compartilhada entre as duas fontes
// ─────────────────────────────────────────────────────────────────────────────
function buildCard(video: any, channel: any, now: Date): any | null {
  const videoTitle: string = video.snippet?.title || '';

  // Filtros negativos de título
  if (REGEX_FACE_VISIBLE.test(videoTitle)) return null;
  if (REGEX_SHORTS.test(videoTitle)) return null;

  // Duração: descartar Shorts (< 3 min)
  const durationSec = parseDuration(video.contentDetails?.duration || '');
  if (durationSec > 0 && durationSec < 180) return null;

  const subsRaw = parseInt(channel.statistics?.subscriberCount || '0', 10);
  const videoCount = parseInt(channel.statistics?.videoCount || '0', 10);
  const viewsRaw = parseInt(video.statistics?.viewCount || '0', 10);

  const publishedAt = new Date(video.snippet?.publishedAt);
  const ageInDays = Math.max(Math.ceil((now.getTime() - publishedAt.getTime()) / 86_400_000), 1);

  // VPH calculado com precisão usando horas reais
  const hoursElapsed = Math.max((now.getTime() - publishedAt.getTime()) / 3_600_000, 1);
  const vphRaw = Math.floor(viewsRaw / hoursElapsed);
  const viewsPerDay = Math.floor(viewsRaw / ageInDays);

  // Outlier: views deste vídeo ÷ inscritos do canal
  // Alto outlier = YouTube empurrando para não-inscritos
  const outlierMultiplier = subsRaw > 0 ? viewsRaw / subsRaw : 0;

  // Score de faceless
  const facelessScore = scoreFacelessChannel(channel, video);

  const channelCreatedYear = channel.snippet?.publishedAt
    ? new Date(channel.snippet.publishedAt).getFullYear().toString()
    : '—';

  return {
    id: video.id,
    title: videoTitle,
    channel: channel.snippet?.title || '',
    channelUrl: `https://www.youtube.com/channel/${channel.id}`,
    channelCreatedAt: channelCreatedYear,
    subscribers: formatSubsDisplay(subsRaw),
    subscribersRaw: subsRaw,
    views: formatViewsDisplay(viewsRaw),
    viewsRaw,
    publishedAt: publishedAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
    publishedAtRaw: publishedAt.toISOString(),
    outlierMultiplier: Math.round(outlierMultiplier),
    outlierMultiplierRaw: Math.round(outlierMultiplier),
    viewsPerDay,
    vph: formatVph(vphRaw),
    vphRaw,
    facelessScore,
    thumbnail: getThumbnailType(facelessScore, videoTitle),
    thumbnailUrl:
      video.snippet?.thumbnails?.maxres?.url ||
      video.snippet?.thumbnails?.high?.url ||
      video.snippet?.thumbnails?.medium?.url || '',
    videoUrl: `https://www.youtube.com/watch?v=${video.id}`,
    syntheticMedia: video.status?.containsSyntheticMedia === true,
    score: Math.min(Math.round(
      Math.min(outlierMultiplier * 3, 40) +
      (vphRaw > 1000 ? 20 : vphRaw > 500 ? 12 : vphRaw > 100 ? 6 : 0) +
      Math.min(facelessScore / 2, 30)
    ), 99),
    niche: detectNiche(videoTitle),
    lifespan: ageInDays < 14
      ? { type: 'hype', label: '🔥 Hype / Curto Prazo' }
      : { type: 'evergreen', label: '🌲 Evergreen / Perene' },
    // Flags de diagnóstico
    _vphRaw: vphRaw,
    _outlier: outlierMultiplier,
    _faceless: facelessScore,
    _ageInDays: ageInDays,
  };
}

function applyFilters(card: any, maxSubs: number, onlyAI: boolean): boolean {
  if (!card) return false;
  if (card.subscribersRaw > maxSubs) return false;
  const videoCount = card._videoCount || 0; // já filtrado antes do buildCard
  if (card.vphRaw < 100) return false;
  if (card._outlier < 0.5) return false;
  if (card._faceless < 20) return false;
  if (onlyAI && !card.syntheticMedia) return false;
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export async function searchVideos(query: string, maxSubs: number, niche: string, onlyAI = false) {
  const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('Chave de API do YouTube não configurada.');

  const now = new Date();
  const hasKeyword = query.trim().length > 0;

  // ── MODO 1: SEM KEYWORD → Trending (chart=mostPopular + keyword default) ─────
  // Custo total: ~108 unidades (4 mostPopular + 100 search + ~4 channels)
  // O que o YouTube está empurrando AGORA + os mais vistos do nicho nos últimos 90 dias
  //
  // ── MODO 2: COM KEYWORD → Busca direcionada ────────────────────────────────
  // Custo total: ~204 unidades (200 search + ~4 channels)
  // order=viewCount: encontra os mais assistidos que contêm a keyword no período

  const [trendingVideos, keywordVideos] = await Promise.all([
    // Fonte 1: chart=mostPopular — sempre executado, custo irrisório (~4 unidades)
    fetchMostPopular(apiKey, NICHE_CATEGORY[niche]).catch(() => [] as any[]),

    // Fonte 2: keyword search
    hasKeyword
      ? fetchByKeyword(apiKey, query, 90)                      // keyword do usuário
      : fetchByKeyword(apiKey, NICHE_DEFAULT_QUERY[niche] || NICHE_DEFAULT_QUERY['Todos'], 90), // query automática por nicho
  ]);

  // ── Deduplicar por ID de vídeo ───────────────────────────────────────────
  const seen = new Set<string>();
  const allVideos: any[] = [];
  for (const v of [...trendingVideos, ...keywordVideos]) {
    if (v?.id && !seen.has(v.id)) {
      seen.add(v.id);
      allVideos.push(v);
    }
  }

  if (allVideos.length === 0) return [];

  // ── Buscar canais (só IDs únicos) ────────────────────────────────────────
  const channelIds = [...new Set(allVideos.map(v => v.snippet?.channelId).filter(Boolean))] as string[];
  const channelMap = await fetchChannels(apiKey, channelIds);

  // ── Filtrar por video count aqui (antes do buildCard) ───────────────────
  const results: any[] = [];

  for (const video of allVideos) {
    const channel = channelMap.get(video.snippet?.channelId);
    if (!channel) continue;

    // Filtro de total de vídeos do canal: canais jovens têm poucos vídeos
    const videoCount = parseInt(channel.statistics?.videoCount || '0', 10);
    if (videoCount > 50) continue;

    const card = buildCard(video, channel, now);
    if (!card) continue;

    if (!applyFilters(card, maxSubs, onlyAI)) continue;

    results.push(card);
  }

  // ── Ordenação: outlier × faceless (melhor canal dark + maior anomalia) ──
  return results
    .sort((a, b) => (b._faceless * b._outlier) - (a._faceless * a._outlier))
    .slice(0, 20);
}
