'use server';

// Headers to bypass Google API key HTTP Referrer restriction when called server-side
const YT_HEADERS = {
  'Referer': 'https://www.darkmine.fun/',
  'Origin': 'https://www.darkmine.fun',
};

export async function searchVideos(query: string, maxSubs: number, niche: string) {
  const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("Chave de API do YouTube não configurada.");
  }

  // 1. Pesquisa — últimos 6 meses para ter volume
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

  // 3. Obter estatísticas dos canais
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
  const regexCopy = /\b(eu|meu|minha|vlog|podcast|tour|unboxing|reagindo|react)\b/i;

  for (const video of allVideosData) {
    const channel = allChannelsData.find((c: any) => c.id === video.snippet.channelId);
    if (!channel) continue;

    // Filtro de Regex (Copywriting) - descarta conteúdo de face visível
    if (regexCopy.test(video.snippet.title)) continue;

    // Filtro por inscritos (canais pequenos = oportunidade)
    const subsRaw = parseInt(channel.statistics?.subscriberCount || '0', 10);
    if (subsRaw > maxSubs) continue;

    // Cálculo de Recência e Velocidade (VPD)
    const publishedAt = new Date(video.snippet.publishedAt);
    let ageInDays = Math.ceil((now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60 * 24));
    if (ageInDays < 1) ageInDays = 1;

    // Só vídeos dos últimos 180 dias
    if (ageInDays > 180) continue;

    const viewsRaw = parseInt(video.statistics?.viewCount || '0', 10);
    const viewsPerDay = Math.floor(viewsRaw / ageInDays);

    // VPD mínimo de 200 (mais permissivo para garantir resultados)
    if (viewsPerDay < 200) continue;

    // A Regra de Anomalia (Outlier) - views/subscribers
    const outlierMultiplier = subsRaw > 0 ? Number((viewsRaw / subsRaw).toFixed(2)) : 0;

    // Outlier mínimo de 1x (qualquer vídeo que superou o número de inscritos)
    if (outlierMultiplier < 1) continue;

    // Detecta IA (bonus, não obrigatório)
    const isSynthetic = video.status?.containsSyntheticMedia === true;

    results.push({
      id: video.id,
      title: video.snippet.title,
      channel: channel.snippet.title,
      channelUrl: `https://www.youtube.com/channel/${channel.id}`,
      subscribers: subsRaw,
      views: viewsRaw,
      publishedAt: publishedAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
      outlierMultiplier: outlierMultiplier,
      viewsPerDay: viewsPerDay,
      thumbnailUrl:
        video.snippet.thumbnails?.maxres?.url ||
        video.snippet.thumbnails?.high?.url ||
        video.snippet.thumbnails?.medium?.url ||
        '',
      videoUrl: `https://www.youtube.com/watch?v=${video.id}`,
      syntheticMedia: isSynthetic,
    });
  }

  // Ordenar pelo maior outlierMultiplier (maior anomalia primeiro)
  return results.sort((a, b) => b.outlierMultiplier - a.outlierMultiplier).slice(0, 20);
}
