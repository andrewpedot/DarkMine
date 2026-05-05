'use server';

export async function searchVideos(query: string, maxSubs: number, niche: string) {
  const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("Chave de API do YouTube não configurada.");
  }

  // 1. Pesquisa
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const publishedAfterStr = sixMonthsAgo.toISOString();
  
  let allSearchItems: any[] = [];
  let nextPageToken = '';
  
  for (let i = 0; i < 3; i++) { // search a bit more to find syntheticMedia
      const pageTokenParam = nextPageToken ? `&pageToken=${nextPageToken}` : '';
      const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=50&q=${encodeURIComponent(query)}&type=video&regionCode=US&relevanceLanguage=en&publishedAfter=${publishedAfterStr}${pageTokenParam}&key=${apiKey}`);
      const searchData = await searchRes.json();
      if (searchData.error) {
          if (i === 0) throw new Error(searchData.error.message);
          break;
      }
      if (searchData.items) allSearchItems.push(...searchData.items);
      nextPageToken = searchData.nextPageToken;
      if (!nextPageToken) break;
  }

  if (allSearchItems.length === 0) throw new Error("Nenhum vídeo encontrado para esta pesquisa.");

  const videoIdsArr = allSearchItems.map((item: any) => item.id.videoId).filter(Boolean);
  const channelIdsArr = Array.from(new Set(allSearchItems.map((item: any) => item.snippet.channelId).filter(Boolean)));

  if (videoIdsArr.length === 0) throw new Error("Não foi possível extrair IDs dos vídeos.");

  // 2. Obter estatísticas dos vídeos
  let allVideosData: any[] = [];
  for (let i = 0; i < videoIdsArr.length; i += 50) {
      const batch = videoIdsArr.slice(i, i + 50).join(',');
      const videosRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet,status&id=${batch}&key=${apiKey}`);
      const videosData = await videosRes.json();
      if (videosData.items) allVideosData.push(...videosData.items);
  }

  // 3. Obter estatísticas dos canais
  let allChannelsData: any[] = [];
  for (let i = 0; i < channelIdsArr.length; i += 50) {
      const batch = channelIdsArr.slice(i, i + 50).join(',');
      const channelsRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${batch}&key=${apiKey}`);
      const channelsData = await channelsRes.json();
      if (channelsData.items) allChannelsData.push(...channelsData.items);
  }

  const now = new Date();
  const results: any[] = [];
  const regexCopy = /\b(eu|meu|minha|vlog|podcast|tour|unboxing|reagindo|react)\b/i;

  for (const video of allVideosData) {
    const channel = allChannelsData.find((c: any) => c.id === video.snippet.channelId);
    if (!channel) continue;

    // Filtro de Regex (Copywriting):
    if (regexCopy.test(video.snippet.title)) {
      continue;
    }

    // A Captura Sintética (IA):
    if (video.status?.containsSyntheticMedia !== true) {
      // Commenting this out during testing might be necessary if no videos have it,
      // but the prompt is STRICT: "O vídeo SÓ passa se a propriedade booleana status.containsSyntheticMedia for true"
      continue;
    }

    // Cálculo de Recência e Velocidade (VPD):
    const publishedAt = new Date(video.snippet.publishedAt);
    let ageInDays = Math.ceil((now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60 * 24));
    if (ageInDays < 1) ageInDays = 1;

    // O vídeo SÓ passa se ageInDays for <= 30 dias.
    if (ageInDays > 30) continue;

    const viewsRaw = parseInt(video.statistics?.viewCount || '0', 10);
    const viewsPerDay = Math.floor(viewsRaw / ageInDays);

    // O vídeo SÓ passa se o viewsPerDay for >= 1.500.
    if (viewsPerDay < 1500) continue;

    // A Regra de Anomalia (Outlier):
    const subsRaw = parseInt(channel.statistics?.subscriberCount || '0', 10);
    const outlierMultiplier = subsRaw > 0 ? Number((viewsRaw / subsRaw).toFixed(2)) : 0;

    // O vídeo SÓ passa se tiver viewCount >= 50.000 E um outlierMultiplier >= 5.
    if (viewsRaw < 50000 || outlierMultiplier < 5) continue;

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
      thumbnailUrl: video.snippet.thumbnails?.maxres?.url || video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.medium?.url || '',
      videoUrl: `https://www.youtube.com/watch?v=${video.id}`,
      syntheticMedia: video.status?.containsSyntheticMedia === true
    });
  }

  // Ordenar pelo maior viewsPerDay
  return results.sort((a, b) => b.viewsPerDay - a.viewsPerDay);
}
