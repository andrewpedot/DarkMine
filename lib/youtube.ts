import { supabase } from './supabase';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
const YOUTUBE_QUOTA_LIMIT = 10000;

export interface YouTubeVideo {
  id: string;
  title: string;
  channelId: string;
  channelName: string;
  publishedAt: Date;
  durationSec: number;
  views: number;
  likes: number;
  commentCount: number;
  thumbnailUrl: string;
  description: string;
  tags: string[];
  containsSyntheticMedia: boolean;
}

export interface YouTubeChannel {
  id: string;
  name: string;
  createdAtYouTube: Date;
  subscriberCount: number;
  totalViews: number;
  totalVideos: number;
  country: string;
  bannerUrl: string;
  description: string;
}

export interface QuotaInfo {
  unitsUsed: number;
  unitsLimit: number;
  remaining: number;
}

const cache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) {
    return entry.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL });
}

export async function checkQuota(): Promise<QuotaInfo | null> {
  if (!supabase) return null;
  
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('youtube_quota')
    .select('units_used, units_limit')
    .eq('date', today)
    .single();
  
  if (error || !data) {
    return { unitsUsed: 0, unitsLimit: YOUTUBE_QUOTA_LIMIT, remaining: YOUTUBE_QUOTA_LIMIT };
  }
  
  return {
    unitsUsed: data.units_used,
    unitsLimit: data.units_limit,
    remaining: data.units_limit - data.units_used,
  };
}

export async function consumeQuota(units: number): Promise<boolean> {
  if (!supabase) return true;
  
  const today = new Date().toISOString().split('T')[0];
  
  const { error } = await supabase.rpc('consume_youtube_quota', {
    quota_date: today,
    units_to_add: units,
  });
  
  if (error) {
    console.error('Failed to consume quota:', error);
    return false;
  }
  
  return true;
}

export async function searchVideos(
  query: string,
  maxResults: number = 50,
  publishedAfter?: Date
): Promise<{ videos: YouTubeVideo[]; quotaCost: number }> {
  const cacheKey = `search:${query}:${maxResults}`;
  const cached = getCached<YouTubeVideo[]>(cacheKey);
  if (cached) {
    return { videos: cached, quotaCost: 0 };
  }

  const quotaInfo = await checkQuota();
  if (quotaInfo && quotaInfo.remaining < 1000) {
    throw new Error('YouTube API quota exhausted');
  }

  const publishedStr = publishedAfter?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('maxResults', String(Math.min(maxResults, 50)));
  url.searchParams.set('q', query);
  url.searchParams.set('type', 'video');
  url.searchParams.set('regionCode', 'US');
  url.searchParams.set('relevanceLanguage', 'en');
  url.searchParams.set('publishedAfter', publishedStr);
  url.searchParams.set('key', YOUTUBE_API_KEY || '');

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  const quotaCost = 100;
  await consumeQuota(quotaCost);

  const videos: YouTubeVideo[] = (data.items || []).map((item: any) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    channelId: item.snippet.channelId,
    channelName: item.snippet.channelTitle,
    publishedAt: new Date(item.snippet.publishedAt),
    durationSec: 0,
    views: 0,
    likes: 0,
    commentCount: 0,
    thumbnailUrl: item.snippet.thumbnails?.maxres?.url || item.snippet.thumbnails?.high?.url || '',
    description: item.snippet.description,
    tags: [],
    containsSyntheticMedia: false,
  }));

  setCache(cacheKey, videos);
  return { videos, quotaCost };
}

export async function getVideoDetails(
  videoIds: string[]
): Promise<{ videos: YouTubeVideo[]; quotaCost: number }> {
  if (!videoIds.length) return { videos: [], quotaCost: 0 };

  const quotaInfo = await checkQuota();
  if (quotaInfo && quotaInfo.remaining < 1000) {
    throw new Error('YouTube API quota exhausted');
  }

  const idBatch = videoIds.slice(0, 50).join(',');
  
  const url = new URL('https://www.googleapis.com/youtube/v3/videos');
  url.searchParams.set('part', 'statistics,contentDetails,snippet,status');
  url.searchParams.set('id', idBatch);
  url.searchParams.set('key', YOUTUBE_API_KEY || '');

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  const quotaCost = Math.ceil(videoIds.length / 50) * 2;
  await consumeQuota(quotaCost);

  const videos: YouTubeVideo[] = (data.items || []).map((item: any) => ({
    id: item.id,
    title: item.snippet.title,
    channelId: item.snippet.channelId,
    channelName: item.snippet.channelTitle,
    publishedAt: new Date(item.snippet.publishedAt),
    durationSec: parseDuration(item.contentDetails?.duration || 'PT0S'),
    views: parseInt(item.statistics?.viewCount || '0', 10),
    likes: parseInt(item.statistics?.likeCount || '0', 10),
    commentCount: parseInt(item.statistics?.commentCount || '0', 10),
    thumbnailUrl: item.snippet.thumbnails?.maxres?.url || item.snippet.thumbnails?.high?.url || '',
    description: item.snippet.description,
    tags: item.snippet.tags || [],
    containsSyntheticMedia: item.status?.containsSyntheticMedia || false,
  }));

  return { videos, quotaCost };
}

export async function getChannelDetails(
  channelIds: string[]
): Promise<{ channels: YouTubeChannel[]; quotaCost: number }> {
  if (!channelIds.length) return { channels: [], quotaCost: 0 };

  const quotaInfo = await checkQuota();
  if (quotaInfo && quotaInfo.remaining < 1000) {
    throw new Error('YouTube API quota exhausted');
  }

  const idBatch = channelIds.slice(0, 50).join(',');
  
  const url = new URL('https://www.googleapis.com/youtube/v3/channels');
  url.searchParams.set('part', 'statistics,snippet');
  url.searchParams.set('id', idBatch);
  url.searchParams.set('key', YOUTUBE_API_KEY || '');

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  const quotaCost = Math.ceil(channelIds.length / 50) * 2;
  await consumeQuota(quotaCost);

  const channels: YouTubeChannel[] = (data.items || []).map((item: any) => ({
    id: item.id,
    name: item.snippet.title,
    createdAtYouTube: new Date(item.snippet.publishedAt),
    subscriberCount: parseInt(item.statistics?.subscriberCount || '0', 10),
    totalViews: parseInt(item.statistics?.viewCount || '0', 10),
    totalVideos: parseInt(item.statistics?.videoCount || '0', 10),
    country: item.snippet.country,
    bannerUrl: item.snippet?.banner?.thumbnails?.[0]?.url || '',
    description: item.snippet.description,
  }));

  return { channels, quotaCost };
}

export async function getCommentThreads(
  videoId: string,
  maxResults: number = 20
): Promise<{ comments: string[]; quotaCost: number }> {
  const quotaInfo = await checkQuota();
  if (quotaInfo && quotaInfo.remaining < 1000) {
    throw new Error('YouTube API quota exhausted');
  }

  const url = new URL('https://www.googleapis.com/youtube/v3/commentThreads');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('videoId', videoId);
  url.searchParams.set('maxResults', String(maxResults));
  url.searchParams.set('key', YOUTUBE_API_KEY || '');

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  const quotaCost = 2;
  await consumeQuota(quotaCost);

  const comments = (data.items || []).map((item: any) => 
    item.snippet.topLevelComment.snippet.textOriginal
  );

  return { comments, quotaCost };
}

function parseDuration(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

export async function saveVideoToDb(video: YouTubeVideo, channelId: string): Promise<void> {
  if (!supabase) return;

  await supabase.from('videos').upsert({
    id: video.id,
    title: video.title,
    channel_id: channelId,
    channel_name: video.channelName,
    published_at: video.publishedAt,
    duration_sec: video.durationSec,
    views: video.views,
    likes: video.likes,
    comment_count: video.commentCount,
    thumbnail_url: video.thumbnailUrl,
    description: video.description,
    tags: video.tags,
    contains_synthetic_media: video.containsSyntheticMedia,
  }, { onConflict: 'id' });
}

export async function saveChannelToDb(channel: YouTubeChannel): Promise<void> {
  if (!supabase) return;

  await supabase.from('yt_channels').upsert({
    id: channel.id,
    name: channel.name,
    created_at_youtube: channel.createdAtYouTube,
    subscriber_count: channel.subscriberCount,
    total_views: channel.totalViews,
    total_videos: channel.totalVideos,
    country: channel.country,
    banner_url: channel.bannerUrl,
    description: channel.description,
  }, { onConflict: 'id' });
}