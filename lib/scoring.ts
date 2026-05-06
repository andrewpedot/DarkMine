import { YouTubeChannel, YouTubeVideo } from './youtube';

export interface NicheMatch {
  nicheId: number;
  subnicheId: number;
  confidence: number;
}

export interface ScoreBreakdown {
  facelessScore: number;
  commentGoldScore: number;
  timingBonus: number;
  monetizationSignals: number;
  nicheScore: number;
  finalScore: number;
}

const PERSON_NAME_PATTERNS = [
  /\b[A-Z][a-z]+ [A-Z][a-z]+\b/,
  /\b(John|Mike|James|David|Chris|Sarah|Emma|Jennifer|Mark|Tom|Anna|Marie|Lisa|Steve|Roberto|Pedro|João|Marcos|André)\b/i,
];

const FIRST_NAME_START = /^(John|Mike|James|David|Chris|Sarah|Emma|Jennifer|Mark|Tom|Anna|Marie|Lisa|Steve|Roberto|Pedro|João|Marcos|André)/i;

const MONEY_KEYWORDS = ['invest', 'money', 'finance', 'crypto', 'bitcoin', 'stock', 'trading', 'profit', 'income', 'wealth', 'passive', 'earning', 'make money', 'rich'];

const ENTERTAINMENT_KEYWORDS = ['game', 'movie', 'music', 'funny', 'comedy', 'challenge', 'dance', 'song', 'reaction', 'mukbang', 'vlog'];

export function computeFacelessScore(channel: YouTubeChannel, videos: YouTubeVideo[]): number {
  let score = 0;
  const channelTitle = channel.name;
  const channelDesc = channel.description || '';

  let hasPersonName = false;
  for (const pattern of PERSON_NAME_PATTERNS) {
    if (pattern.test(channelTitle)) {
      hasPersonName = true;
      break;
    }
  }

  if (!hasPersonName) {
    score += 25;
  }

  if (!channelDesc.includes('I am') && !channelDesc.includes("I'm ") && !channelDesc.includes('my name is')) {
    score += 25;
  }

  if (channelDesc.toLowerCase().includes('face') || channelDesc.toLowerCase().includes('voice') || !channelDesc) {
    score += 25;
  }

  if (!FIRST_NAME_START.test(channelTitle)) {
    score += 25;
  }

  return Math.min(score, 100);
}

const GOLD_COMMENT_PATTERNS = [
  { pattern: /I need more/i, weight: 3 },
  { pattern: /please make/i, weight: 3 },
  { pattern: /nobody talks about/i, weight: 4 },
  { pattern: /I'd pay for/i, weight: 5 },
  { pattern: /I struggle with/i, weight: 4 },
  { pattern: /I wasted/i, weight: 4 },
  { pattern: /I'm scared/i, weight: 4 },
  { pattern: /I wish you covered/i, weight: 4 },
  { pattern: /\bI'm \d+\b/i, weight: 3 },
  { pattern: /as a \w+, i/i, weight: 3 },
  { pattern: /does anyone know/i, weight: 2 },
  { pattern: /how do i/i, weight: 3 },
  { pattern: /can someone explain/i, weight: 2 },
  { pattern: /this helped me/i, weight: 2 },
  { pattern: /thank you.*(for|to)/i, weight: 2 },
  { pattern: /more (please|content)/i, weight: 3 },
  { pattern: /subscribe[d]? because/i, weight: 1 },
];

export function computeCommentGoldScore(comments: string[]): number {
  if (!comments || comments.length === 0) return 0;

  let totalWeight = 0;
  let maxPossible = comments.length * 5;

  for (const comment of comments) {
    const lower = comment.toLowerCase();
    for (const { pattern, weight } of GOLD_COMMENT_PATTERNS) {
      if (pattern.test(comment)) {
        totalWeight += weight;
      }
    }
  }

  const normalizedScore = Math.round((totalWeight / maxPossible) * 100);
  return Math.min(normalizedScore, 100);
}

export interface Niche {
  id: number;
  name: string;
  parent_id: number | null;
  keywords: string[];
}

export function classifyNiche(
  title: string,
  description: string,
  tags: string[],
  dbNiches?: Niche[]
): NicheMatch {
  const text = `${title} ${description} ${tags.join(' ')}`.toLowerCase();

  let bestNicheId = 0;
  let bestSubnicheId = 0;
  let bestConfidence = 0;

  if (dbNiches && dbNiches.length > 0) {
    for (const niche of dbNiches) {
      if (!niche.keywords || niche.keywords.length === 0) continue;
      
      let matches = 0;
      for (const keyword of niche.keywords) {
        if (text.includes(keyword.toLowerCase())) {
          matches++;
        }
      }
      
      const confidence = Math.round((matches / niche.keywords.length) * 100);
      
      if (confidence > bestConfidence) {
        bestConfidence = confidence;
        if (niche.parent_id) {
          bestSubnicheId = niche.id;
          bestNicheId = niche.parent_id;
        } else {
          bestNicheId = niche.id;
          bestSubnicheId = 0;
        }
      }
    }
  } else {
    // Fallback to hardcoded keywords if no DB niches provided
    const nicheKeywords: Record<string, string[]> = {
      '1': ['finance', 'investing', 'money', 'stocks', 'crypto', 'bitcoin'],
      '2': ['true crime', 'murder', 'mystery', 'unsolved', 'investigation'],
      '3': ['technology', 'ai', 'artificial intelligence', 'software', 'coding'],
      '4': ['history', 'historical', 'documentary', 'war', 'ancient'],
      '5': ['psychology', 'mental health', 'mind', 'behavior', 'therapy'],
      '6': ['geopolitics', 'politics', 'world affairs', 'economy'],
      '7': ['stoicism', 'philosophy', 'wisdom', 'life lessons'],
      '8': ['space', 'science', 'universe', 'astronomy', 'nasa'],
    };

    for (const [nicheId, keywords] of Object.entries(nicheKeywords)) {
      let matches = 0;
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          matches++;
        }
      }
      const confidence = Math.round((matches / keywords.length) * 100);
      if (confidence > bestConfidence) {
        bestConfidence = confidence;
        bestNicheId = parseInt(nicheId);
      }
    }
  }

  return {
    nicheId: bestNicheId,
    subnicheId: bestSubnicheId,
    confidence: bestConfidence,
  };
}

export function computeTimingBonus(channel: YouTubeChannel): number {
  let bonus = 0;

  const now = new Date();
  const channelCreated = channel.createdAtYouTube || new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const ageInMonths = (now.getTime() - channelCreated.getTime()) / (1000 * 60 * 60 * 24 * 30);

  if (ageInMonths < 6) {
    bonus += 10;
  } else if (ageInMonths < 12) {
    bonus += 5;
  }

  if (channel.totalViews > 0 && channel.totalVideos > 0) {
    const avgViewsPerVideo = channel.totalViews / channel.totalVideos;
    if (avgViewsPerVideo > 500000) {
      bonus += 10;
    } else if (avgViewsPerVideo > 100000) {
      bonus += 5;
    }
  }

  return Math.min(bonus, 25);
}

export function computeMonetizationSignals(description: string): number {
  if (!description) return 0;

  let score = 0;
  const lowerDesc = description.toLowerCase();

  const hasLink = /https?:\/\//.test(description);
  if (hasLink) {
    score += 5;
  }

  const affiliatePatterns = [
    /amazon\.(com|br|co\.uk)/i,
    /link\.bio/i,
    /gumroad/i,
    /patreon/i,
    /sponsor/i,
    /affiliate/i,
    /disclaimer/i,
  ];

  for (const pattern of affiliatePatterns) {
    if (pattern.test(lowerDesc)) {
      score += 10;
      break;
    }
  }

  const communityPatterns = [
    /discord/i,
    /telegram/i,
    /community/i,
    /join our/i,
    /members?only/i,
    /course/i,
    /masterclass/i,
  ];

  for (const pattern of communityPatterns) {
    if (pattern.test(lowerDesc)) {
      score += 15;
      break;
    }
  }

  return Math.min(score, 30);
}

interface ScoringSignals {
  facelessScore: number;
  commentGoldScore: number;
  timingBonus: number;
  monetizationSignals: number;
  outlierMultiplier: number;
}

export function computeFinalScore(
  signals: ScoringSignals,
  searchType: 'money' | 'entertainment' | 'mixed' = 'mixed'
): { score: number; breakdown: ScoreBreakdown } {
  const weights = searchType === 'money'
    ? { faceless: 0.25, commentGold: 0.20, timing: 0.15, monetization: 0.15, outlier: 0.25 }
    : searchType === 'entertainment'
    ? { faceless: 0.30, commentGold: 0.15, timing: 0.15, monetization: 0.10, outlier: 0.30 }
    : { faceless: 0.25, commentGold: 0.20, timing: 0.15, monetization: 0.15, outlier: 0.25 };

  const outlierScore = Math.min(signals.outlierMultiplier * 20, 100);

  const facelessScaled = signals.facelessScore * weights.faceless;
  const commentScaled = signals.commentGoldScore * weights.commentGold;
  const timingScaled = signals.timingBonus * (100 / 25) * weights.timing;
  const monetizationScaled = signals.monetizationSignals * (100 / 30) * weights.monetization;
  const outlierScaled = outlierScore * weights.outlier;

  const finalScore = Math.round(
    facelessScaled + commentScaled + timingScaled + monetizationScaled + outlierScaled
  );

  const breakdown: ScoreBreakdown = {
    facelessScore: signals.facelessScore,
    commentGoldScore: signals.commentGoldScore,
    timingBonus: signals.timingBonus,
    monetizationSignals: signals.monetizationSignals,
    nicheScore: 0,
    finalScore,
  };

  return { score: Math.min(finalScore, 100), breakdown };
}

export function calculateOutlierMultiplier(views: number, subscribers: number): number {
  if (subscribers <= 0) return 0;
  return Number((views / subscribers).toFixed(2));
}

export function calculateViewsPerDay(views: number, publishedAt: Date): number {
  const now = new Date();
  const ageInDays = Math.max(
    (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60 * 24),
    1
  );
  return Math.floor(views / ageInDays);
}

export function determineSearchType(keywords: string[]): 'money' | 'entertainment' | 'mixed' {
  const keywordStr = keywords.join(' ').toLowerCase();
  
  let moneyMatches = 0;
  let entertainmentMatches = 0;

  for (const kw of keywords) {
    const lower = kw.toLowerCase();
    if (MONEY_KEYWORDS.some(mk => lower.includes(mk))) {
      moneyMatches++;
    }
    if (ENTERTAINMENT_KEYWORDS.some(ek => lower.includes(ek))) {
      entertainmentMatches++;
    }
  }

  if (moneyMatches > entertainmentMatches) return 'money';
  if (entertainmentMatches > moneyMatches) return 'entertainment';
  return 'mixed';
}