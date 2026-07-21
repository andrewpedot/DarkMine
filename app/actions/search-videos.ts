'use server';

// Headers to bypass Google API key HTTP Referrer restriction when called server-side
const YT_HEADERS = {
  'Referer': 'https://www.darkmine.fun/',
  'Origin': 'https://www.darkmine.fun',
};

// ─────────────────────────────────────────────────────────────────────────────
// ESTRATÉGIA DE BUSCA — Duas queries por nicho, duas passagens paralelas:
//
// • NICHE_EXACT_QUERY  — Frases exatas entre aspas ("forbidden places" "not allowed")
//   Retorna canais que usam o mesmo padrão de título dos canais alvos.
//   Muito precisa, baixo spam.
//
// • NICHE_BROAD_QUERY  — Termos livres, sem aspas.
//   Cobre variedade maior. Mais resultados mas mais ruído.
//
// Lógica: order=viewCount + 30 dias
// Pequenos canais que viralizaram nos últimos 30 dias aparecem entre os mais vistos
// mesmo competindo com canais grandes — porque o volume total de views é maior.
// ─────────────────────────────────────────────────────────────────────────────

// Query exata: frases literais encontradas nos títulos dos canais faceless top
// Baseado em análise real: The Kiwi Grandpa, Mr Austral, Lost UK, Ghost Towns Canada,
// Placeologist, WhereFoodBegan, ForgottenOldAmerican, Hidden Scotland, etc.
//
// Regra: queries testadas pela API e confirmadas com resultados ≥ 1 canal small (<50K subs)
// com VPH ≥ 15 e outlier ≥ 0.5 nos últimos 30 dias.
const NICHE_EXACT_QUERY: Record<string, string> = {
  // TESTADO: retorna 14 canais (Kiwi Grandpa, Mr Austral, Lost UK, Placeologist...)
  'Todos':          '"forbidden places" "not allowed"',
  // TESTADO: retorna 7 canais dark faceless (Dark Enigma, Shocking Crime Cases...)
  'True Crime':     'disappeared "without a trace" mystery case',
  // TESTADO: retorna Geo-Bites (369vph), Hidden Scotland (64vph)...
  'História':       'dark secrets history documentary facts',
  // Nichos com poucos canais small ativos — queries testadas mas com < 2 resultados:
  'Finanças':       'billionaire rise fall dark secrets untold story',
  'Tech':           'dark secrets technology algorithm exposed untold',
  'Psicologia':     'dark psychology manipulation mind secrets untold',
  'Geopolítica':    'forbidden government conspiracy dark secrets exposed',
  'Estoicismo':     'forbidden ancient wisdom philosophy dark truth untold',
  'Espaço/Ciência': 'dark secrets universe space mystery classified untold',
};

// Query ampla: captura formatos adicionais que a exata pode não cobrir
// Para "Todos": "you had no idea" é a hook phrase de WhereFoodBegan e similares
// Para outros nichos: variação mais genérica da query exata
const NICHE_BROAD_QUERY: Record<string, string> = {
  // TESTADO: "you had no idea foods invented" retorna WhereFoodBegan (105vph, 10.7K subs)
  // Versão sem "foods" para capturar qualquer nicho: história, lugares, ciência...
  'Todos':          '"you had no idea" hidden forgotten facts history',
  'True Crime':     'unsolved murder disappeared mystery documentary dark untold',
  'História':       'forbidden history secrets untold dark ancient documentary',
  'Finanças':       'dark money billionaire empire fraud secrets story untold',
  'Tech':           'dark algorithm technology forbidden secrets exposed documentary',
  'Psicologia':     'dark psychology manipulation mind control cult untold story',
  'Geopolítica':    'forbidden government dark secret conspiracy exposed documentary',
  'Estoicismo':     'forbidden ancient philosophy wisdom dark truth untold documentary',
  'Espaço/Ciência': 'dark space mystery forbidden nasa universe classified untold',
};

// ─────────────────────────────────────────────────────────────────────────────
// REGEX — filtros de título
// ─────────────────────────────────────────────────────────────────────────────

// Conteúdo com rosto ou formato não-faceless óbvio
const REGEX_FACE_VISIBLE = /\b(vlog|podcast|unboxing|react|q&a|qna|storytime|story time|mukbang|get ready with me|grwm|haul|day in my life|watch me|my life|my story|my reaction|i tried|i spent|challenge|with me)\b/i;

// YouTube Shorts
const REGEX_SHORTS = /#shorts?\b|\bshorts?\b$/i;

// Clipes de música oficiais, letras, áudios
const REGEX_MUSIC = /\b(official audio|official video|official music video|music video|lyrics?|letra|video oficial|audio oficial|official lyric|lyric video|visualizer|album|single|ft\.|feat\.)\b|\bofficial\b.*\b(audio|video)\b/i;

// Idioma não-inglês — stopwords de espanhol, português, francês, alemão
const REGEX_NON_ENGLISH_TITLE =
  /\b(el |la |los |las |fue |para |como |pero |este |esto |eso |una |del |con |por |que |des |sur |les |pour |dans |avec |une |van |het |die |der |das |und |nicht |ist |sein )\b|\b(não|também|muito|aqui|isso|tudo|seus|suas|nosso|nossa|pelo|pela|como|quando|onde|quem|nada|cada|outro|outra)\b/i;

// Conteúdo regional com título em inglês mas canal não-anglófono
// Inclui: Bollywood, canais indianos (₹, crore, lakh), conteúdo asiático legendado
const REGEX_REGIONAL_CONTENT =
  /\b(bollywood|hindi|telugu|tamil|bengali|marathi|kannada|punjabi|urdu|rekha|amitabh|shahrukh|salman|deepika|priyanka|crore|lakh)\b|\[eng(lish)?\s*(sub|dub)\]|\[full\s*(episode|story|video)\]|#bollywood|#hindi|₹|₩|¥/i;

// ─────────────────────────────────────────────────────────────────────────────
// FILTRO DE CONTEÚDO FACELESS-AI
//
// Antes exigia keyword "dark" — bloqueava canais legítimos como WhereFoodBegan
// ("10 Foods You Had No Idea Were Invented in Istanbul") e Placeologist
// ("15 Weird Places You Didn't Know").
//
// Agora: aceita conteúdo dark/dark-crime OU formato listicle faceless-AI típico.
// ─────────────────────────────────────────────────────────────────────────────

// Grupo 1: Conteúdo sombrio, crime, investigação, conspirações
const DARK_TITLE_RE =
  /\b(secret\w*|hidden|hide|hid|expose\w*|untold|truth|shocking|reveal\w*|conspiracy|dark|disturb\w*|mystery|mysterious|unsolved|crime|criminal|murder\w*|killer?s?|kill(?:ed|ing|s)?|disappear\w*|missing|cover.?up|forbidden|classif\w*|trapped|dead|death|died|dying|deadly|dangerous|chill\w*|haunt\w*|terrif\w*|sinister|bizarre|eerie|twisted|horrify\w*|gruesome|brutal|ghost|abandon\w*|crep\w*|creep\w*|restrict\w*)\b/i;

// Grupo 2: Documentário, investigação, caso, história
const DARK_TITLE_RE2 =
  /\b(documentary|documentaries|investigat\w+|case|cases|story|stories|history|footage|evidence|caught|arrest\w*|sentenced|execut\w+|verdict|confession|testimony|trial|lawsuit|incident|tragedy|disaster|collapse|breakdown|aftermath|cold.?case|reopened|exposed|body|bodies|remains|bones?|chop\w*|dismember\w*|bury|buried|shallow grave|crime scene|ancient|ruins?|underground|vault\w*)\b/i;

// Grupo 3: Finanças dark, corrupção, poder
const DARK_TITLE_RE3 =
  /\b(billionaire|millionaire|empire|scheme|scam|fraud|heist|scandal|downfall|rise and fall|ruin\w*|destroy\w*|corrupt\w*|laundering|cartel|mafia|mob|gang|kingpin|infiltrat\w*)\b/i;

// Grupo 4: Psicologia, manipulação, cults
const DARK_TITLE_RE4 =
  /\b(psycholog\w*|manipulat\w*|narcissist|sociopath|psychopath|dark side|experiment|cults?|escap\w+|surviv\w+|victim|predator|groom\w*|stalker?|stalking|obsess\w*|abduct\w*|kidnap\w*)\b/i;

// Grupo 5: Guerra, crime organizado, terrorismo, investigação policial
const DARK_TITLE_RE5 =
  /\b(war|battle|nuclear|biological|chemical|weapon|attack|bombing|genocide|massacre|assassin\w*|terror\w*|extremist|radical|spy\w*|agent|intel|operation|fbi|cia|police|detective|hunt\w*|violent\w*|violence|robb\w+|prison|jail|fugitive|escaped|suspect|guilty|convicted|sentenced|slain|slaughter\w*|corpse|body parts)\b/i;

// Grupo 6: Formato listicle/faceless-AI — títulos que não são "dark" mas são claramente
// conteúdo narrado por IA sem rosto: "10 Foods You Had No Idea...", "15 Weird Places..."
// Canais como WhereFoodBegan, Placeologist, ForgottenOldAmerican, The Kiwi Grandpa
const FACELESS_LISTICLE_RE =
  /^\d+\s|\b(places?|spots?|towns?|cities|countries|islands?|foods?|recipes?|dishes|drinks?|meals?|facts|things|ways|reasons|inventions?|discoveries|wonders?|secrets?|forgotten|weird|strange|bizarre|unexplained|rare|most\s+people|you\s+had\s+no\s+idea|you\s+didn.?t\s+know|nobody\s+knows|off.?limits|no.?one\s+can|off\s+the\s+map)\b/i;

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
  if (/food|recipe|dish|meal|cuisine|ingredient|cook/.test(t)) return 'default';
  if (/place|town|city|island|forbidden|abandoned|ghost/.test(t)) return 'default';
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
  if (/history|ancient|century|civilization|forgotten|diner|food/.test(t)) return 'História';
  if (/place|town|city|island|forbidden|abandoned|ghost/.test(t)) return 'Lugares';
  return 'Outros';
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORE DE FACELESS
// Canais dark/faceless AI usam: stock footage + narração, sem rosto na câmera.
// Canais tradicionais/profissionais: "Studios", "Media", "TV", pronomes pessoais,
// criados antes de 2019, descrições institucionais.
// ─────────────────────────────────────────────────────────────────────────────

// Nomes que indicam produção profissional/institucional — NÃO faceless
const NON_FACELESS_NAME =
  /\b(studios?|productions?|media|network|networks|news|tv|television|broadcasting|films?|entertainment|official|channel|press|times|post|journal|magazine|inc\.?|llc\.?|corp\.?|ltd\.?)\b/i;

// Nomes/padrões típicos de canais dark/faceless/places/history (bônus)
const FACELESS_NAME_KEYWORDS =
  /\b(dark|crime|mystery|files|vault|archives?|untold|secret|truth|stories|case|history|shadow|phantom|classified|unknown|horror|exposed|forbidden|chilling|sinister|bizarre|psycho|mind|places?|forgotten|ghost|abandoned|explorer|discovery|mysteries|vault)\b/i;

// Descrições que indicam canal com pessoa real ou organização
const PERSONAL_OR_ORG_DESC =
  /\b(I am|I'm|my name is|hi,?\s+I'm|hello,?\s+I'm|hosted by|presented by|journalist|reporter|anchor|author|writer|founded by|established in|our team|our staff|our reporters|our journalists|subscribe to my|join my|my channel|my videos|my content|follow me|check out my)\b/i;

function scoreFacelessChannel(channel: any, video: any): number {
  let score = 0;

  const videoCount = parseInt(channel.statistics?.videoCount || '0', 10);
  const totalChannelViews = parseInt(channel.statistics?.viewCount || '0', 10);
  const channelTitle: string = channel.snippet?.title || '';
  const videoTitle: string = video.snippet?.title || '';
  const channelDescription: string = channel.snippet?.description || '';
  const channelCreatedAt = channel.snippet?.publishedAt
    ? new Date(channel.snippet.publishedAt)
    : null;
  const channelYear = channelCreatedAt ? channelCreatedAt.getFullYear() : 0;

  // ── PENALIDADES (sinais de canal NÃO-faceless) ────────────────────────────

  // Penalidade forte: nome indica produção profissional ou mídia tradicional
  if (NON_FACELESS_NAME.test(channelTitle)) score -= 40;

  // Penalidade forte: descrição com pronomes pessoais ou linguagem organizacional
  if (PERSONAL_OR_ORG_DESC.test(channelDescription)) score -= 55;

  // Penalidade: canal antigo (pré-era AI/faceless)
  if (channelYear > 0 && channelYear < 2019) score -= 20;
  else if (channelYear >= 2019 && channelYear < 2021) score -= 5;

  // ── BÔNUS (sinais de canal faceless) ──────────────────────────────────────

  // Bônus: canal criado na era AI faceless (2021+)
  if (channelYear >= 2024) score += 30;
  else if (channelYear >= 2023) score += 25;
  else if (channelYear >= 2022) score += 15;
  else if (channelYear >= 2021) score += 8;

  // Bônus: nome do canal com keywords dark/faceless típicas
  if (FACELESS_NAME_KEYWORDS.test(channelTitle)) score += 20;

  // Bônus: média alta de views por vídeo
  const avgViewsPerVideo = videoCount > 0 ? totalChannelViews / videoCount : 0;
  if (avgViewsPerVideo > 500_000) score += 30;
  else if (avgViewsPerVideo > 100_000) score += 20;
  else if (avgViewsPerVideo > 20_000) score += 10;
  else if (avgViewsPerVideo > 5_000) score += 5;

  // Bônus: poucos vídeos (canal focado)
  if (videoCount < 30) score += 15;
  else if (videoCount < 80) score += 10;
  else if (videoCount < 150) score += 5;

  // Bônus: nome NÃO parece nome de pessoa real (ex: "João Silva", "Flo")
  const channelWords = channelTitle.trim().split(/\s+/);
  const looksLikePersonName = (
    (channelWords.length === 1 && /^[A-Z][a-z]{2,8}$/.test(channelTitle)) ||
    (channelWords.length === 2 && channelWords.every(w => /^[A-Z][a-z]{2,}$/.test(w)) &&
      !FACELESS_NAME_KEYWORDS.test(channelTitle))
  );
  if (!looksLikePersonName) score += 10;

  // Bônus: formato listicle no título — "15 Places...", "10 Foods..." → faceless AI clássico
  if (/^\d+\s/.test(videoTitle)) score += 15;

  // Bônus: palavras-chave dark/faceless no título do vídeo (cada regex que bate = +8)
  let contentMatches = 0;
  for (const re of [DARK_TITLE_RE, DARK_TITLE_RE2, DARK_TITLE_RE3, DARK_TITLE_RE4, DARK_TITLE_RE5]) {
    if (re.test(videoTitle)) contentMatches++;
  }
  score += contentMatches * 8; // até +40

  // Bônus máximo: YouTube declarou conteúdo com IA
  if (video.status?.containsSyntheticMedia === true) score += 60;

  return score;
}

// ─────────────────────────────────────────────────────────────────────────────
// FONTE — search por keyword (BUSCA POR NICHO ESPECÍFICO)
// Custo: 100 unidades/página
// order=viewCount: retorna os vídeos MAIS ASSISTIDOS do período — encontra canais
//   pequenos que viralizaram (maior sinal de push algorítmico).
// order=relevance: retorna o que o YouTube está recomendando ativamente no nicho.
// ─────────────────────────────────────────────────────────────────────────────
async function fetchByKeyword(
  apiKey: string,
  query: string,
  publishedAfterDays = 30,
  order: 'relevance' | 'date' | 'viewCount' = 'viewCount',
  maxPages = 2,
): Promise<any[]> {
  const after = new Date();
  after.setDate(after.getDate() - publishedAfterDays);

  const searchItems: any[] = [];
  let pageToken = '';

  for (let i = 0; i < maxPages; i++) {
    const params = new URLSearchParams({
      part: 'snippet',
      maxResults: '50',
      q: query,
      type: 'video',
      relevanceLanguage: 'en',
      order,
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

  // Buscar estatísticas completas dos vídeos (search só retorna snippet)
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
// FILTRO + SCORE — lógica compartilhada
// ─────────────────────────────────────────────────────────────────────────────
function buildCard(video: any, channel: any, now: Date): any | null {
  const videoTitle: string = video.snippet?.title || '';
  const channelTitle: string = channel.snippet?.title || '';

  // Filtros negativos de título
  if (REGEX_FACE_VISIBLE.test(videoTitle)) return null;
  if (REGEX_SHORTS.test(videoTitle)) return null;
  if (REGEX_MUSIC.test(videoTitle)) return null;
  if (REGEX_NON_ENGLISH_TITLE.test(videoTitle)) return null;

  // Filtro de conteúdo regional (Bollywood/Hindi) — títulos em inglês mas canal não-anglófono
  if (REGEX_REGIONAL_CONTENT.test(videoTitle)) return null;
  if (REGEX_REGIONAL_CONTENT.test(channelTitle)) return null;

  // Filtro de conteúdo: deve ser dark/crime OU formato listicle/faceless típico
  // Substitui o antigo "hasDarkKeyword" que bloqueava WhereFoodBegan, Placeologist, etc.
  const hasDarkKeyword =
    DARK_TITLE_RE.test(videoTitle) ||
    DARK_TITLE_RE2.test(videoTitle) ||
    DARK_TITLE_RE3.test(videoTitle) ||
    DARK_TITLE_RE4.test(videoTitle) ||
    DARK_TITLE_RE5.test(videoTitle);
  const hasFacelessFormat = FACELESS_LISTICLE_RE.test(videoTitle);

  if (!hasDarkKeyword && !hasFacelessFormat) return null;

  // Duração: descartar Shorts (< 3 min) e streams/podcasts (> 90 min)
  const durationSec = parseDuration(video.contentDetails?.duration || '');
  if (durationSec > 0 && durationSec < 180) return null;
  if (durationSec > 5400) return null;

  const subsRaw = parseInt(channel.statistics?.subscriberCount || '0', 10);
  const viewsRaw = parseInt(video.statistics?.viewCount || '0', 10);

  const publishedAt = new Date(video.snippet?.publishedAt);
  const ageInDays = Math.max(Math.ceil((now.getTime() - publishedAt.getTime()) / 86_400_000), 1);
  const hoursElapsed = Math.max((now.getTime() - publishedAt.getTime()) / 3_600_000, 1);

  const vphRaw = Math.floor(viewsRaw / hoursElapsed);
  const viewsPerDay = Math.floor(viewsRaw / ageInDays);

  // Outlier: views ÷ inscritos do canal
  // Alto = YouTube empurrando para não-inscritos
  const outlierMultiplier = subsRaw > 0 ? viewsRaw / subsRaw : 0;

  // Score de faceless
  const facelessScore = scoreFacelessChannel(channel, video);

  const channelCreatedYear = channel.snippet?.publishedAt
    ? new Date(channel.snippet.publishedAt).getFullYear().toString()
    : '—';

  return {
    id: video.id,
    title: videoTitle,
    channel: channelTitle,
    channelUrl: `https://www.youtube.com/channel/${channel.id}`,
    channelCreatedAt: channelCreatedYear,
    subscribers: formatSubsDisplay(subsRaw),
    subscribersRaw: subsRaw,
    views: formatViewsDisplay(viewsRaw),
    viewsRaw,
    publishedAt: publishedAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
    publishedAtRaw: publishedAt.toISOString(),
    outlierMultiplier: Math.round(outlierMultiplier * 10) / 10,
    outlierMultiplierRaw: outlierMultiplier,
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
    _vphRaw: vphRaw,
    _outlier: outlierMultiplier,
    _faceless: facelessScore,
    _ageInDays: ageInDays,
  };
}

function applyFilters(card: any, maxSubs: number, onlyAI: boolean): boolean {
  if (!card) return false;
  if (card.subscribersRaw > maxSubs) return false;

  // VPH mínimo: ~14K views em 30 dias — inclui nichos menores (Finance, History, Places)
  if (card.vphRaw < 15) return false;

  // Outlier mínimo: 0.5 = vídeo tem pelo menos 50% do nº de inscritos em views
  // Reduzido de 1.0 para incluir canais como Placeologist (0.52x) sem perder qualidade
  if (card._outlier < 0.5) return false;

  // Faceless score: 20 = passa canais sem sinais fortes de produção profissional/pessoa real
  // Reduzido de 30 para incluir canais como The Kiwi Grandpa (criado em 2020, nome neutro)
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

  const exactQuery = NICHE_EXACT_QUERY[niche] || NICHE_EXACT_QUERY['Todos'];
  const broadQuery = NICHE_BROAD_QUERY[niche] || NICHE_BROAD_QUERY['Todos'];

  // ── Passagens paralelas ───────────────────────────────────────────────────
  //
  // Modo "Todos" usa 3 queries para cobrir os 3 maiores formatos faceless-AI:
  //   1. '"forbidden places" "not allowed"' → Places (Kiwi Grandpa, Placeologist, Mr Austral...)
  //   2. '"you had no idea" foods invented' → Food/History (WhereFoodBegan, First Taste...)
  //   3. 'disappeared "without a trace" mystery case' → True Crime (Dark Enigma, Shocking Crime...)
  //
  // Todos os outros nichos usam 2 queries:
  //   1. viewCount 30d exata → vídeos mais vistos do nicho no período
  //   2. relevance 30d ampla → o que o YouTube está ativamente recomendando

  let allSourceVideos: any[][];

  if (hasKeyword) {
    // Busca por keyword do usuário — 2 passagens com a mesma query
    allSourceVideos = await Promise.all([
      fetchByKeyword(apiKey, query, 30, 'viewCount', 2),
      fetchByKeyword(apiKey, query, 30, 'relevance', 1),
    ]);
  } else if (niche === 'Todos') {
    // Modo Todos — 3 queries especializadas por formato faceless-AI
    allSourceVideos = await Promise.all([
      fetchByKeyword(apiKey, '"forbidden places" "not allowed"',           30, 'viewCount', 1),
      fetchByKeyword(apiKey, '"you had no idea" foods invented',            30, 'viewCount', 1),
      fetchByKeyword(apiKey, 'disappeared "without a trace" mystery case', 30, 'viewCount', 1),
    ]);
  } else {
    // Nichos específicos — 2 passagens
    allSourceVideos = await Promise.all([
      fetchByKeyword(apiKey, exactQuery, 30, 'viewCount', 1),
      fetchByKeyword(apiKey, broadQuery, 30, 'relevance', 1),
    ]);
  }

  // ── Deduplicar por ID de vídeo ───────────────────────────────────────────
  const seen = new Set<string>();
  const allVideos: any[] = [];
  for (const v of allSourceVideos.flat()) {
    if (v?.id && !seen.has(v.id)) {
      seen.add(v.id);
      allVideos.push(v);
    }
  }

  if (allVideos.length === 0) return [];

  // ── Buscar canais (só IDs únicos) ────────────────────────────────────────
  const channelIds = [...new Set(allVideos.map(v => v.snippet?.channelId).filter(Boolean))] as string[];
  const channelMap = await fetchChannels(apiKey, channelIds);

  // ── Construir cards e aplicar filtros ────────────────────────────────────
  const results: any[] = [];

  for (const video of allVideos) {
    const channel = channelMap.get(video.snippet?.channelId);
    if (!channel) continue;

    // Filtro de total de vídeos do canal:
    // > 300 = fábrica de conteúdo (spam diário), não canal focado
    const videoCount = parseInt(channel.statistics?.videoCount || '0', 10);
    if (videoCount > 300) continue;

    const card = buildCard(video, channel, now);
    if (!card) continue;

    if (!applyFilters(card, maxSubs, onlyAI)) continue;

    results.push(card);
  }

  // ── Ordenação: combinação de faceless × outlier × VPH ───────────────────
  return results
    .sort((a, b) => {
      const scoreA = a._faceless * Math.min(a._outlier, 10) * Math.log1p(a._vphRaw);
      const scoreB = b._faceless * Math.min(b._outlier, 10) * Math.log1p(b._vphRaw);
      return scoreB - scoreA;
    })
    .slice(0, 20);
}
