import { NextRequest, NextResponse } from 'next/server';

export interface MediaItem {
  id: string;
  source: 'pexels' | 'pixabay' | 'unsplash' | 'youtube_cc' | 'archive';
  type: 'video' | 'photo';
  title: string;
  thumbnailUrl: string;
  previewUrl?: string;
  downloadUrl: string;
  width: number;
  height: number;
  duration?: number;
  author: string;
  license: string;
  sourceUrl: string;
  quality: string;
  youtubeId?: string;
}

interface SearchRequest {
  query: string;
  type: 'video' | 'photo' | 'both';
  sources: string[];
  orientation?: 'landscape' | 'portrait' | 'square';
  quality?: '4k' | 'hd' | 'all';
  page?: number;
}

async function searchPexelsVideos(query: string, orientation: string, page: number): Promise<MediaItem[]> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return [];

  const orientationParam = orientation !== 'all' ? `&orientation=${orientation}` : '';
  const res = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=20&page=${page}${orientationParam}`,
    { headers: { Authorization: key } }
  );
  if (!res.ok) return [];
  const data = await res.json();

  return (data.videos || []).map((v: any): MediaItem => {
    const files: any[] = v.video_files || [];
    const best = files.sort((a: any, b: any) => (b.width || 0) - (a.width || 0))[0];
    const preview = files.find((f: any) => f.quality === 'sd') || files[files.length - 1];
    const w = best?.width || v.width || 1920;
    const h = best?.height || v.height || 1080;
    const qual = w >= 3840 ? '4K' : w >= 1920 ? 'HD' : 'SD';
    return {
      id: `pexels_v_${v.id}`,
      source: 'pexels',
      type: 'video',
      title: v.url?.split('/').filter(Boolean).pop() || `Pexels Video ${v.id}`,
      thumbnailUrl: v.image || '',
      previewUrl: preview?.link || best?.link || '',
      downloadUrl: best?.link || '',
      width: w,
      height: h,
      duration: v.duration,
      author: v.user?.name || 'Pexels',
      license: 'Pexels License',
      sourceUrl: v.url || '',
      quality: qual,
    };
  });
}

async function searchPexelsPhotos(query: string, orientation: string, page: number): Promise<MediaItem[]> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return [];

  const orientationParam = orientation !== 'all' ? `&orientation=${orientation}` : '';
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=20&page=${page}${orientationParam}`,
    { headers: { Authorization: key } }
  );
  if (!res.ok) return [];
  const data = await res.json();

  return (data.photos || []).map((p: any): MediaItem => {
    const w = p.width || 1920;
    const h = p.height || 1080;
    const qual = w >= 3840 ? '4K' : w >= 1920 ? 'HD' : 'SD';
    return {
      id: `pexels_p_${p.id}`,
      source: 'pexels',
      type: 'photo',
      title: p.alt || `Pexels Photo ${p.id}`,
      thumbnailUrl: p.src?.medium || p.src?.small || '',
      downloadUrl: p.src?.original || p.src?.large2x || '',
      width: w,
      height: h,
      author: p.photographer || 'Pexels',
      license: 'Pexels License',
      sourceUrl: p.url || '',
      quality: qual,
    };
  });
}

async function searchPixabayVideos(query: string, page: number): Promise<MediaItem[]> {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return [];

  const res = await fetch(
    `https://pixabay.com/api/videos/?key=${key}&q=${encodeURIComponent(query)}&per_page=20&page=${page}&video_type=all`
  );
  if (!res.ok) return [];
  const data = await res.json();

  return (data.hits || []).map((v: any): MediaItem => {
    const large = v.videos?.large;
    const medium = v.videos?.medium;
    const best = large?.url ? large : medium;
    const w = best?.width || 1920;
    const h = best?.height || 1080;
    const qual = w >= 3840 ? '4K' : w >= 1920 ? 'HD' : 'SD';
    return {
      id: `pixabay_v_${v.id}`,
      source: 'pixabay',
      type: 'video',
      title: v.tags || `Pixabay Video ${v.id}`,
      thumbnailUrl: v.picture_id
        ? `https://i.vimeocdn.com/video/${v.picture_id}_295x166.jpg`
        : '',
      previewUrl: medium?.url || best?.url || '',
      downloadUrl: best?.url || '',
      width: w,
      height: h,
      duration: v.duration,
      author: v.user || 'Pixabay',
      license: 'Pixabay License',
      sourceUrl: `https://pixabay.com/videos/id-${v.id}/`,
      quality: qual,
    };
  });
}

async function searchPixabayPhotos(query: string, page: number): Promise<MediaItem[]> {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return [];

  const res = await fetch(
    `https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(query)}&per_page=20&page=${page}&image_type=photo`
  );
  if (!res.ok) return [];
  const data = await res.json();

  return (data.hits || []).map((p: any): MediaItem => {
    const w = p.imageWidth || p.webformatWidth || 1920;
    const h = p.imageHeight || p.webformatHeight || 1080;
    const qual = w >= 3840 ? '4K' : w >= 1920 ? 'HD' : 'SD';
    return {
      id: `pixabay_p_${p.id}`,
      source: 'pixabay',
      type: 'photo',
      title: p.tags || `Pixabay Photo ${p.id}`,
      thumbnailUrl: p.previewURL || p.webformatURL || '',
      downloadUrl: p.largeImageURL || p.webformatURL || '',
      width: w,
      height: h,
      author: p.user || 'Pixabay',
      license: 'Pixabay License',
      sourceUrl: p.pageURL || '',
      quality: qual,
    };
  });
}

async function searchUnsplash(query: string, page: number): Promise<MediaItem[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return [];

  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=20&page=${page}`,
    { headers: { Authorization: `Client-ID ${key}` } }
  );
  if (!res.ok) return [];
  const data = await res.json();

  return (data.results || []).map((p: any): MediaItem => {
    const w = p.width || 1920;
    const h = p.height || 1080;
    const qual = w >= 3840 ? '4K' : w >= 1920 ? 'HD' : 'SD';
    return {
      id: `unsplash_${p.id}`,
      source: 'unsplash',
      type: 'photo',
      title: p.alt_description || p.description || `Unsplash Photo`,
      thumbnailUrl: p.urls?.small || p.urls?.thumb || '',
      downloadUrl: p.urls?.raw || p.urls?.full || '',
      width: w,
      height: h,
      author: p.user?.name || 'Unsplash',
      license: 'Unsplash License',
      sourceUrl: p.links?.html || '',
      quality: qual,
    };
  });
}

async function searchYouTubeCC(query: string, page: number): Promise<MediaItem[]> {
  const key = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  if (!key) return [];

  const pageTokenParam = page > 1 ? '' : '';
  const searchRes = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoLicense=creativeCommon&maxResults=20&key=${key}${pageTokenParam}`
  );
  if (!searchRes.ok) return [];
  const searchData = await searchRes.json();
  const items = searchData.items || [];
  if (items.length === 0) return [];

  const ids = items.map((i: any) => i.id?.videoId).filter(Boolean).join(',');
  const detailRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${ids}&key=${key}`
  );
  const detailData = detailRes.ok ? await detailRes.json() : { items: [] };
  const detailMap: Record<string, any> = {};
  for (const d of detailData.items || []) {
    detailMap[d.id] = d;
  }

  return items
    .filter((i: any) => i.id?.videoId)
    .map((i: any): MediaItem => {
      const vid = i.id.videoId;
      const detail = detailMap[vid];
      const iso = detail?.contentDetails?.duration || 'PT0S';
      const duration = parseISODuration(iso);
      const thumb = i.snippet?.thumbnails?.high?.url || i.snippet?.thumbnails?.medium?.url || '';
      return {
        id: `youtube_${vid}`,
        source: 'youtube_cc',
        type: 'video',
        title: i.snippet?.title || `YouTube Video ${vid}`,
        thumbnailUrl: thumb,
        previewUrl: `https://www.youtube.com/embed/${vid}`,
        downloadUrl: `https://www.youtube.com/watch?v=${vid}`,
        width: 1920,
        height: 1080,
        duration,
        author: i.snippet?.channelTitle || 'YouTube',
        license: 'Creative Commons (CC BY)',
        sourceUrl: `https://www.youtube.com/watch?v=${vid}`,
        quality: 'HD',
        youtubeId: vid,
      };
    });
}

function parseISODuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return (parseInt(match[1] || '0') * 3600) +
    (parseInt(match[2] || '0') * 60) +
    parseInt(match[3] || '0');
}

async function searchArchive(query: string, page: number): Promise<MediaItem[]> {
  const start = (page - 1) * 20;
  const res = await fetch(
    `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}+AND+mediatype:(movies)&fl[]=identifier,title,description,subject,creator&rows=20&start=${start}&output=json`
  );
  if (!res.ok) return [];
  const data = await res.json();
  const docs = data.response?.docs || [];

  return docs.map((doc: any): MediaItem => {
    const id = doc.identifier || '';
    return {
      id: `archive_${id}`,
      source: 'archive',
      type: 'video',
      title: doc.title || id,
      thumbnailUrl: `https://archive.org/services/img/${id}`,
      previewUrl: `https://archive.org/embed/${id}`,
      downloadUrl: `https://archive.org/download/${id}`,
      width: 1920,
      height: 1080,
      author: Array.isArray(doc.creator) ? doc.creator[0] : (doc.creator || 'Archive.org'),
      license: 'Public Domain',
      sourceUrl: `https://archive.org/details/${id}`,
      quality: 'HD',
    };
  });
}

function filterByQuality(items: MediaItem[], quality: string): MediaItem[] {
  if (quality === 'all') return items;
  if (quality === '4k') return items.filter(i => i.quality === '4K');
  if (quality === 'hd') return items.filter(i => i.quality === '4K' || i.quality === 'HD');
  return items;
}

export async function POST(req: NextRequest) {
  try {
    const body: SearchRequest = await req.json();
    const { query, type, sources, orientation = 'landscape', quality = 'all', page = 1 } = body;

    if (!query?.trim()) {
      return NextResponse.json({ error: 'Query é obrigatória' }, { status: 400 });
    }

    const tasks: Promise<MediaItem[]>[] = [];

    if (sources.includes('pexels')) {
      if (type === 'video' || type === 'both') tasks.push(searchPexelsVideos(query, orientation, page).catch(() => []));
      if (type === 'photo' || type === 'both') tasks.push(searchPexelsPhotos(query, orientation, page).catch(() => []));
    }
    if (sources.includes('pixabay')) {
      if (type === 'video' || type === 'both') tasks.push(searchPixabayVideos(query, page).catch(() => []));
      if (type === 'photo' || type === 'both') tasks.push(searchPixabayPhotos(query, page).catch(() => []));
    }
    if (sources.includes('unsplash') && (type === 'photo' || type === 'both')) {
      tasks.push(searchUnsplash(query, page).catch(() => []));
    }
    if (sources.includes('youtube_cc') && (type === 'video' || type === 'both')) {
      tasks.push(searchYouTubeCC(query, page).catch(() => []));
    }
    if (sources.includes('archive') && (type === 'video' || type === 'both')) {
      tasks.push(searchArchive(query, page).catch(() => []));
    }

    const results = await Promise.allSettled(tasks);
    const allItems = results
      .filter((r): r is PromiseFulfilledResult<MediaItem[]> => r.status === 'fulfilled')
      .flatMap(r => r.value);

    const filtered = filterByQuality(allItems, quality);

    const missing: string[] = [];
    if (sources.includes('pexels') && !process.env.PEXELS_API_KEY) missing.push('PEXELS_API_KEY');
    if (sources.includes('pixabay') && !process.env.PIXABAY_API_KEY) missing.push('PIXABAY_API_KEY');
    if (sources.includes('unsplash') && !process.env.UNSPLASH_ACCESS_KEY) missing.push('UNSPLASH_ACCESS_KEY');

    return NextResponse.json({ items: filtered, missingKeys: missing });
  } catch (err) {
    console.error('[media/search]', err);
    return NextResponse.json({ error: 'Erro interno', items: [] }, { status: 500 });
  }
}
