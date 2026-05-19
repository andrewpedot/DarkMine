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

interface SourceResult {
  source: string;
  count: number;
  error?: string;
}

async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    return res;
  } catch (err: any) {
    clearTimeout(timeout);
    throw err;
  }
}

async function searchPexelsVideos(
  query: string,
  orientation: string,
  page: number
): Promise<{ items: MediaItem[]; error?: string }> {
  const key = process.env.PEXELS_API_KEY?.trim();
  if (!key) return { items: [], error: 'PEXELS_API_KEY não configurada' };

  const orientationParam = ['landscape', 'portrait', 'square'].includes(orientation)
    ? `&orientation=${orientation}`
    : '';

  try {
    const res = await safeFetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=20&page=${page}${orientationParam}`,
      { headers: { Authorization: key } }
    );
    if (!res.ok) {
      const err = `Pexels videos HTTP ${res.status}`;
      console.error('[media/search] ' + err);
      return { items: [], error: err };
    }
    const data = await res.json();
    const items: MediaItem[] = (data.videos || []).map((v: any): MediaItem => {
      const files: any[] = [...(v.video_files || [])];
      files.sort((a: any, b: any) => (b.width || 0) - (a.width || 0));
      const best = files[0];
      const preview = files.find((f: any) => f.quality === 'sd') || files[files.length - 1];
      const w = best?.width || v.width || 1920;
      const h = best?.height || v.height || 1080;
      return {
        id: `pexels_v_${v.id}`,
        source: 'pexels',
        type: 'video',
        title: v.url?.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') || `Pexels Video ${v.id}`,
        thumbnailUrl: v.image || '',
        previewUrl: preview?.link || best?.link || '',
        downloadUrl: best?.link || '',
        width: w,
        height: h,
        duration: v.duration,
        author: v.user?.name || 'Pexels',
        license: 'Pexels License',
        sourceUrl: v.url || '',
        quality: w >= 3840 ? '4K' : w >= 1920 ? 'HD' : 'SD',
      };
    });
    return { items };
  } catch (err: any) {
    const msg = `Pexels videos: ${err?.message || 'erro desconhecido'}`;
    console.error('[media/search] ' + msg);
    return { items: [], error: msg };
  }
}

async function searchPexelsPhotos(
  query: string,
  orientation: string,
  page: number
): Promise<{ items: MediaItem[]; error?: string }> {
  const key = process.env.PEXELS_API_KEY?.trim();
  if (!key) return { items: [], error: 'PEXELS_API_KEY não configurada' };

  const orientationParam = ['landscape', 'portrait', 'square'].includes(orientation)
    ? `&orientation=${orientation}`
    : '';

  try {
    const res = await safeFetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=20&page=${page}${orientationParam}`,
      { headers: { Authorization: key } }
    );
    if (!res.ok) {
      const err = `Pexels photos HTTP ${res.status}`;
      console.error('[media/search] ' + err);
      return { items: [], error: err };
    }
    const data = await res.json();
    const items: MediaItem[] = (data.photos || []).map((p: any): MediaItem => {
      const w = p.width || 1920;
      const h = p.height || 1080;
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
        quality: w >= 3840 ? '4K' : w >= 1920 ? 'HD' : 'SD',
      };
    });
    return { items };
  } catch (err: any) {
    const msg = `Pexels photos: ${err?.message || 'erro desconhecido'}`;
    console.error('[media/search] ' + msg);
    return { items: [], error: msg };
  }
}

async function searchPixabayVideos(
  query: string,
  page: number
): Promise<{ items: MediaItem[]; error?: string }> {
  const key = process.env.PIXABAY_API_KEY?.trim();
  if (!key) return { items: [], error: 'PIXABAY_API_KEY não configurada' };

  try {
    const res = await safeFetch(
      `https://pixabay.com/api/videos/?key=${key}&q=${encodeURIComponent(query)}&per_page=20&page=${page}&video_type=all`
    );
    if (!res.ok) {
      const err = `Pixabay videos HTTP ${res.status}`;
      console.error('[media/search] ' + err);
      return { items: [], error: err };
    }
    const data = await res.json();
    const items: MediaItem[] = (data.hits || []).map((v: any): MediaItem => {
      const large = v.videos?.large;
      const medium = v.videos?.medium;
      const small = v.videos?.small;
      const best = large?.url ? large : medium?.url ? medium : small;
      const previewVid = medium?.url ? medium : small;
      const w = best?.width || 1920;
      const h = best?.height || 1080;
      // Pixabay video thumbnails: construct from tags or use userImageURL
      const thumb =
        v.userImageURL ||
        (v.picture_id ? `https://i.vimeocdn.com/video/${v.picture_id}_295x166.jpg` : '');
      return {
        id: `pixabay_v_${v.id}`,
        source: 'pixabay',
        type: 'video',
        title: (v.tags || '').split(',')[0]?.trim() || `Pixabay Video ${v.id}`,
        thumbnailUrl: thumb,
        previewUrl: previewVid?.url || best?.url || '',
        downloadUrl: best?.url || '',
        width: w,
        height: h,
        duration: v.duration,
        author: v.user || 'Pixabay',
        license: 'Pixabay License',
        sourceUrl: `https://pixabay.com/videos/id-${v.id}/`,
        quality: w >= 3840 ? '4K' : w >= 1920 ? 'HD' : 'SD',
      };
    });
    return { items };
  } catch (err: any) {
    const msg = `Pixabay videos: ${err?.message || 'erro desconhecido'}`;
    console.error('[media/search] ' + msg);
    return { items: [], error: msg };
  }
}

async function searchPixabayPhotos(
  query: string,
  page: number
): Promise<{ items: MediaItem[]; error?: string }> {
  const key = process.env.PIXABAY_API_KEY?.trim();
  if (!key) return { items: [], error: 'PIXABAY_API_KEY não configurada' };

  try {
    const res = await safeFetch(
      `https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(query)}&per_page=20&page=${page}&image_type=photo`
    );
    if (!res.ok) {
      const err = `Pixabay photos HTTP ${res.status}`;
      console.error('[media/search] ' + err);
      return { items: [], error: err };
    }
    const data = await res.json();
    const items: MediaItem[] = (data.hits || []).map((p: any): MediaItem => {
      const w = p.imageWidth || p.webformatWidth || 1920;
      const h = p.imageHeight || p.webformatHeight || 1080;
      return {
        id: `pixabay_p_${p.id}`,
        source: 'pixabay',
        type: 'photo',
        title: (p.tags || '').split(',')[0]?.trim() || `Pixabay Photo ${p.id}`,
        thumbnailUrl: p.previewURL || p.webformatURL || '',
        downloadUrl: p.largeImageURL || p.webformatURL || '',
        width: w,
        height: h,
        author: p.user || 'Pixabay',
        license: 'Pixabay License',
        sourceUrl: p.pageURL || '',
        quality: w >= 3840 ? '4K' : w >= 1920 ? 'HD' : 'SD',
      };
    });
    return { items };
  } catch (err: any) {
    const msg = `Pixabay photos: ${err?.message || 'erro desconhecido'}`;
    console.error('[media/search] ' + msg);
    return { items: [], error: msg };
  }
}

async function searchUnsplash(
  query: string,
  page: number
): Promise<{ items: MediaItem[]; error?: string }> {
  const key = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (!key) return { items: [], error: 'UNSPLASH_ACCESS_KEY não configurada' };

  try {
    const res = await safeFetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=20&page=${page}`,
      { headers: { Authorization: `Client-ID ${key}` } }
    );
    if (!res.ok) {
      const err = `Unsplash HTTP ${res.status}`;
      console.error('[media/search] ' + err);
      return { items: [], error: err };
    }
    const data = await res.json();
    const items: MediaItem[] = (data.results || []).map((p: any): MediaItem => {
      const w = p.width || 1920;
      const h = p.height || 1080;
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
        quality: w >= 3840 ? '4K' : w >= 1920 ? 'HD' : 'SD',
      };
    });
    return { items };
  } catch (err: any) {
    const msg = `Unsplash: ${err?.message || 'erro desconhecido'}`;
    console.error('[media/search] ' + msg);
    return { items: [], error: msg };
  }
}

async function searchYouTubeCC(
  query: string
): Promise<{ items: MediaItem[]; error?: string }> {
  const key = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY?.trim();
  if (!key) return { items: [], error: 'NEXT_PUBLIC_YOUTUBE_API_KEY não configurada' };

  const ytHeaders = {
    'Referer': 'https://www.darkmine.fun/',
    'Origin': 'https://www.darkmine.fun',
  };

  try {
    const searchRes = await safeFetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoLicense=creativeCommon&maxResults=20&key=${key}`,
      { headers: ytHeaders }
    );
    if (!searchRes.ok) {
      const body = await searchRes.text().catch(() => '');
      const err = `YouTube search HTTP ${searchRes.status}: ${body.slice(0, 200)}`;
      console.error('[media/search] ' + err);
      return { items: [], error: `YouTube search HTTP ${searchRes.status}` };
    }
    const searchData = await searchRes.json();
    const ytItems = searchData.items || [];
    if (ytItems.length === 0) return { items: [] };

    const ids = ytItems
      .map((i: any) => i.id?.videoId)
      .filter(Boolean)
      .join(',');

    const detailRes = await safeFetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${ids}&key=${key}`,
      { headers: ytHeaders }
    );
    const detailData = detailRes.ok ? await detailRes.json() : { items: [] };
    const detailMap: Record<string, any> = {};
    for (const d of detailData.items || []) detailMap[d.id] = d;

    const items: MediaItem[] = ytItems
      .filter((i: any) => i.id?.videoId)
      .map((i: any): MediaItem => {
        const vid = i.id.videoId;
        const iso = detailMap[vid]?.contentDetails?.duration || 'PT0S';
        const thumb =
          i.snippet?.thumbnails?.high?.url ||
          i.snippet?.thumbnails?.medium?.url ||
          i.snippet?.thumbnails?.default?.url ||
          '';
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
          duration: parseISODuration(iso),
          author: i.snippet?.channelTitle || 'YouTube',
          license: 'Creative Commons (CC BY)',
          sourceUrl: `https://www.youtube.com/watch?v=${vid}`,
          quality: 'HD',
          youtubeId: vid,
        };
      });
    return { items };
  } catch (err: any) {
    const msg = `YouTube CC: ${err?.message || 'erro desconhecido'}`;
    console.error('[media/search] ' + msg);
    return { items: [], error: msg };
  }
}

function parseISODuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return (
    parseInt(match[1] || '0') * 3600 +
    parseInt(match[2] || '0') * 60 +
    parseInt(match[3] || '0')
  );
}

async function searchArchive(
  query: string,
  page: number
): Promise<{ items: MediaItem[]; error?: string }> {
  try {
    const start = (page - 1) * 20;
    const res = await safeFetch(
      `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}+AND+mediatype:(movies)&fl[]=identifier,title,description,subject,creator&rows=20&start=${start}&output=json`
    );
    if (!res.ok) {
      const err = `Archive.org HTTP ${res.status}`;
      console.error('[media/search] ' + err);
      return { items: [], error: err };
    }
    const data = await res.json();
    const docs = data.response?.docs || [];
    const items: MediaItem[] = docs.map((doc: any): MediaItem => {
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
        author: Array.isArray(doc.creator)
          ? doc.creator[0]
          : doc.creator || 'Archive.org',
        license: 'Public Domain',
        sourceUrl: `https://archive.org/details/${id}`,
        quality: 'HD',
      };
    });
    return { items };
  } catch (err: any) {
    const msg = `Archive.org: ${err?.message || 'erro desconhecido'}`;
    console.error('[media/search] ' + msg);
    return { items: [], error: msg };
  }
}

function filterByQuality(items: MediaItem[], quality: string): MediaItem[] {
  if (quality === '4k') return items.filter((i) => i.quality === '4K');
  if (quality === 'hd') return items.filter((i) => i.quality === '4K' || i.quality === 'HD');
  return items;
}

export async function POST(req: NextRequest) {
  try {
    const body: SearchRequest = await req.json();
    const {
      query,
      type,
      sources,
      orientation = 'landscape',
      quality = 'all',
      page = 1,
    } = body;

    if (!query?.trim()) {
      return NextResponse.json({ error: 'Query é obrigatória' }, { status: 400 });
    }

    console.log(`[media/search] query="${query}" type=${type} sources=${sources.join(',')} page=${page}`);

    type TaskEntry = { label: string; promise: Promise<{ items: MediaItem[]; error?: string }> };
    const tasks: TaskEntry[] = [];

    if (sources.includes('pexels')) {
      if (type === 'video' || type === 'both')
        tasks.push({ label: 'pexels_video', promise: searchPexelsVideos(query, orientation, page) });
      if (type === 'photo' || type === 'both')
        tasks.push({ label: 'pexels_photo', promise: searchPexelsPhotos(query, orientation, page) });
    }
    if (sources.includes('pixabay')) {
      if (type === 'video' || type === 'both')
        tasks.push({ label: 'pixabay_video', promise: searchPixabayVideos(query, page) });
      if (type === 'photo' || type === 'both')
        tasks.push({ label: 'pixabay_photo', promise: searchPixabayPhotos(query, page) });
    }
    if (sources.includes('unsplash') && (type === 'photo' || type === 'both'))
      tasks.push({ label: 'unsplash', promise: searchUnsplash(query, page) });
    if (sources.includes('youtube_cc') && (type === 'video' || type === 'both'))
      tasks.push({ label: 'youtube_cc', promise: searchYouTubeCC(query) });
    if (sources.includes('archive') && (type === 'video' || type === 'both'))
      tasks.push({ label: 'archive', promise: searchArchive(query, page) });

    const settled = await Promise.allSettled(tasks.map((t) => t.promise));

    const allItems: MediaItem[] = [];
    const sourceStatus: SourceResult[] = [];
    const missingKeys: string[] = [];
    const errors: string[] = [];

    settled.forEach((result, i) => {
      const label = tasks[i].label;
      if (result.status === 'fulfilled') {
        allItems.push(...result.value.items);
        sourceStatus.push({ source: label, count: result.value.items.length, error: result.value.error });
        if (result.value.error) errors.push(result.value.error);
      } else {
        const errMsg = result.reason?.message || String(result.reason);
        sourceStatus.push({ source: label, count: 0, error: errMsg });
        errors.push(`${label}: ${errMsg}`);
      }
    });

    // Report missing keys based on what actually wasn't configured
    if (sources.includes('pexels') && !process.env.PEXELS_API_KEY?.trim())
      missingKeys.push('PEXELS_API_KEY');
    if (sources.includes('pixabay') && !process.env.PIXABAY_API_KEY?.trim())
      missingKeys.push('PIXABAY_API_KEY');
    if (sources.includes('unsplash') && !process.env.UNSPLASH_ACCESS_KEY?.trim())
      missingKeys.push('UNSPLASH_ACCESS_KEY');

    const filtered = filterByQuality(allItems, quality);

    console.log(`[media/search] found ${filtered.length} items after quality filter. Sources:`, sourceStatus);

    return NextResponse.json({
      items: filtered,
      missingKeys,
      sourceStatus,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    console.error('[media/search] fatal error:', err);
    return NextResponse.json({ error: 'Erro interno', items: [] }, { status: 500 });
  }
}
