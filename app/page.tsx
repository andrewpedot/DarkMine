'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';



const MOCK_CARDS = [
  {
    id: "mock-1",
    title: "I Infiltrated the World's Most Secretive Financial Cults",
    titlePtBR: "Eu Me Infiltrei nos Cultos Financeiros Mais Secretos do Mundo",
    channel: "ShadowEconomy",
    channelUrl: "https://www.youtube.com/@ShadowEconomy",
    channelCreatedAt: "2021",
    subscribers: "12.4K",
    views: "2.1M",
    publishedAt: "18 Jan 2025",
    outlierMultiplier: "169x",
    thumbnail: "finance",
    thumbnailUrl: "",
    lifespan: { type: "evergreen", label: "🌲 Evergreen / Perene" },
    statusPt: null,
    statusEs: null,
    niche: "Finanças",
    ctr: "9.4%",
    avgView: "14min 32s",
    score: 97,
    vph: "1.8K",
    vphRaw: 1800,
    outlierMultiplierRaw: 169,
    viewsRaw: 2100000,
  },
  {
    id: "mock-2",
    title: "The Disappearance That the Government Tried to Erase Forever",
    titlePtBR: "O Desaparecimento Que o Governo Tentou Apagar Para Sempre",
    channel: "CrimeDark",
    channelUrl: "https://www.youtube.com/@CrimeDark",
    channelCreatedAt: "2019",
    subscribers: "8.7K",
    views: "1.4M",
    publishedAt: "03 Mar 2025",
    outlierMultiplier: "160x",
    thumbnail: "crime",
    thumbnailUrl: "",
    lifespan: { type: "hype", label: "🔥 Hype / Curto Prazo" },
    statusPt: null,
    statusEs: null,
    niche: "True Crime",
    ctr: "11.2%",
    avgView: "22min 08s",
    score: 93,
    vph: "2.3K",
    vphRaw: 2300,
    outlierMultiplierRaw: 160,
    viewsRaw: 1400000,
  }
];

const NICHES = ["Todos", "Finanças", "True Crime", "Tech", "História", "Psicologia", "Geopolítica", "Estoicismo", "Espaço/Ciência"];

const THUMBNAIL_COLORS: Record<string, string> = {
  finance: "linear-gradient(135deg, #0f2027, #1a3a2a, #0d1b2a)",
  crime: "linear-gradient(135deg, #1a0a0a, #2d0f0f, #0d0d1a)",
  tech: "linear-gradient(135deg, #070d1f, #0a1628, #0d1117)",
  psychology: "linear-gradient(135deg, #1a1025, #2d1b4e, #130b20)",
  geopolitics: "linear-gradient(135deg, #0a192f, #112240, #020c1b)",
  stoicism: "linear-gradient(135deg, #2a2a2a, #3f3f3f, #1a1a1a)",
  space: "linear-gradient(135deg, #000000, #0a0a2a, #00001a)",
  default: "linear-gradient(135deg, #111827, #374151, #1f2937)",
};

const THUMBNAIL_ICONS: Record<string, string> = {
  finance: "💰",
  crime: "🕵️",
  tech: "🤖",
  psychology: "🧠",
  geopolitics: "🌍",
  stoicism: "🏛️",
  space: "🚀",
  default: "📹",
};

const MARKETS = [
  { code: 'de', label: 'Alemão', flag: '🇩🇪', region: 'DE', lang: 'de' },
  { code: 'fr', label: 'Francês', flag: '🇫🇷', region: 'FR', lang: 'fr' },
  { code: 'es', label: 'Espanhol', flag: '🇪🇸', region: 'ES', lang: 'es' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹', region: 'IT', lang: 'it' },
  { code: 'pl', label: 'Polonês', flag: '🇵🇱', region: 'PL', lang: 'pl' },
  { code: 'hu', label: 'Húngaro', flag: '🇭🇺', region: 'HU', lang: 'hu' },
  { code: 'el', label: 'Grego', flag: '🇬🇷', region: 'GR', lang: 'el' },
  { code: 'cs', label: 'Tcheco', flag: '🇨🇿', region: 'CZ', lang: 'cs' },
  { code: 'he', label: 'Hebraico', flag: '🇮🇱', region: 'IL', lang: 'he' },
];

function parseDuration(pt: string) {
  if (!pt) return "N/A";
  const match = pt.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return pt;
  const h = match[1] ? match[1].replace('H', '') : '';
  const m = match[2] ? match[2].replace('M', '') : '0';
  const s = match[3] ? match[3].replace('S', '') : '00';
  
  if (h) return `${h}h ${m}min ${s}s`;
  return `${m}min ${s}s`;
}

function formatNumber(num: number) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return Math.round(num).toString();
}

function getThumbnailType(niche: string) {
    if (niche === 'Finanças') return 'finance';
    if (niche === 'True Crime') return 'crime';
    if (niche === 'Tech') return 'tech';
    if (niche === 'Psicologia') return 'psychology';
    if (niche === 'Geopolítica') return 'geopolitics';
    if (niche === 'Estoicismo') return 'stoicism';
    if (niche === 'Espaço/Ciência') return 'space';
    return 'default';
}

function formatScore(multiplierRaw: number, vphRaw: number) {
  return Math.min(Math.round(multiplierRaw * 10 + (vphRaw > 1000 ? 20 : 0)), 99);
}

function ScoreRing({ score }: { score: number }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="flex flex-col items-center">
      <svg width="48" height="48" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4" />
        <circle
          cx="24" cy="24" r={r}
          fill="none"
          stroke={score >= 90 ? "#a855f7" : score >= 70 ? "#22d3ee" : "#f59e0b"}
          strokeWidth="4"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 24 24)"
          style={{ filter: `drop-shadow(0 0 6px ${score >= 90 ? "#a855f7" : "#22d3ee"})` }}
        />
        <text x="24" y="28" textAnchor="middle" fontSize="11" fontWeight="700" fill="#e2e8f0" fontFamily="JetBrains Mono">
          {score}
        </text>
      </svg>
      <span className="text-[9px] text-gray-500 mt-0.5 font-mono uppercase tracking-wider">Score</span>
    </div>
  );
}

function VideoCard({ card }: { card: any }) {
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [showPtBR, setShowPtBR] = useState(false);
  const [translatedTitle, setTranslatedTitle] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [statusPt, setStatusPt] = useState(card.statusPt || null);
  const [statusEs, setStatusEs] = useState(card.statusEs || null);
  const [isChecking, setIsChecking] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<'Oceano Azul' | 'Saturado' | null>(null);

  useEffect(() => {
      const lib = JSON.parse(localStorage.getItem('darkmine_library') || '[]');
      if (lib.find((c: any) => c.id === card.id)) {
          setSaved(true);
      }
  }, [card.id]);

  const handleSave = (e: any) => {
      e.stopPropagation();
      const lib = JSON.parse(localStorage.getItem('darkmine_library') || '[]');
      if (saved) {
          const newLib = lib.filter((c: any) => c.id !== card.id);
          localStorage.setItem('darkmine_library', JSON.stringify(newLib));
          setSaved(false);
          window.dispatchEvent(new Event('libraryUpdated'));
      } else {
          const newCard = { ...card, libraryStatus: 'Pendente' };
          lib.push(newCard);
          localStorage.setItem('darkmine_library', JSON.stringify(lib));
          setSaved(true);
          window.dispatchEvent(new Event('libraryUpdated'));
      }
  };

  const checkMarket = async (translatedTitle: string, region: string, lang: string) => {
    const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
    if (!apiKey) throw new Error("API Key missing");
    const now = new Date();
    const originalVph = card.vphRaw;

    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=3&q=${encodeURIComponent(translatedTitle)}&type=video&regionCode=${region}&relevanceLanguage=${lang}&key=${apiKey}`);
    const data = await res.json();
    if (!data.items || data.items.length === 0) return 'Oceano Azul';
    
    const vIds = data.items.map((i: any) => i.id.videoId).join(',');
    const vRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${vIds}&key=${apiKey}`);
    const vData = await vRes.json();
    
    let hasRecentHighVph = false;
    
    for (const v of vData.items || []) {
        const pub = new Date(v.snippet.publishedAt);
        const hours = Math.max((now.getTime() - pub.getTime()) / (1000 * 60 * 60), 1);
        const views = parseInt(v.statistics.viewCount || '0', 10);
        const vph = views / hours;
        
        if (hours < 24 * 365 && vph >= originalVph * 0.1) {
            hasRecentHighVph = true;
        }
    }
    
    if (hasRecentHighVph) return 'Saturado';
    return 'Oceano Azul';
  };

  const { toast } = useToast();

  const handleCheckMarket = async (market: typeof MARKETS[0]) => {
    setIsChecking(true);
    setSelectedMarket(market.code);
    
    try {
        const translatedTitleRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${market.lang}&dt=t&q=${encodeURIComponent(card.title)}`).catch(()=>null);
        const translatedTitleData = translatedTitleRes ? await translatedTitleRes.json().catch(()=>null) : null;
        const translatedTitle = translatedTitleData ? translatedTitleData[0].map((item: any) => item[0]).join('') : card.title;
        
        setTranslatedTitle(translatedTitle);
        
        const result = await checkMarket(translatedTitle, market.region, market.lang);
        
        if (market.code === 'es') {
            setStatusEs(result);
        } else if (market.code === 'pt') {
            setStatusPt(result);
        }
        
        setLastResult(result);
        
        if (result === 'Oceano Azul') {
            toast({
                title: `🌊 Oceano Azul em ${market.label}!`,
                description: 'Baixa concorrência detectada.',
                variant: 'default',
                className: 'border-cyan-500/50 bg-cyan-950/90 text-cyan-100',
            });
        } else {
            toast({
                title: `🔴 Mercado Saturado em ${market.label}`,
                description: 'Alta concorrência detectada.',
                variant: 'destructive',
            });
        }
        
        return result;
    } catch (e) {
        console.error(e);
        const result = 'Saturado';
        if (market.code === 'es') {
            setStatusEs(result);
        } else if (market.code === 'pt') {
            setStatusPt(result);
        }
        
        setLastResult(result);
        
        toast({
            title: `⚠️ Erro ao verificar ${market.label}`,
            description: 'Tente novamente em alguns instantes.',
            variant: 'destructive',
        });
        
        return result;
    } finally {
        setIsChecking(false);
        setSelectedMarket(null);
    }
  };

  let targetMarket = 'Brasil (PT-BR)';
  let btnText = 'Gerar Estrutura de Roteiro';
  if (statusPt || statusEs) {
      if (statusPt === 'Oceano Azul' && statusEs !== 'Oceano Azul') {
          targetMarket = 'Brasil (PT-BR)';
          btnText = 'Clonar para Brasil';
      } else if (statusEs === 'Oceano Azul' && statusPt !== 'Oceano Azul') {
          targetMarket = 'México (ES-MX)';
          btnText = 'Clonar para México';
      } else {
          targetMarket = 'Brasil (PT-BR)';
          btnText = 'Clonar para Brasil';
      }
  }

  const handleTranslate = async (e: any) => {
    e.stopPropagation();
    if (showPtBR) {
      setShowPtBR(false);
      return;
    }
    
    if (!translatedTitle && card.title) {
      setIsTranslating(true);
      try {
        const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt&dt=t&q=${encodeURIComponent(card.title)}`);
        const data = await res.json();
        const translatedText = data[0].map((item: any) => item[0]).join('');
        setTranslatedTitle(translatedText);
      } catch (error) {
        console.error(error);
        setTranslatedTitle(card.title);
      }
      setIsTranslating(false);
    }
    setShowPtBR(true);
  };

  const handleOpenVideo = (e: any) => {
      e.stopPropagation();
      window.open(card.videoUrl || `https://www.youtube.com/watch?v=${card.id}`, '_blank');
  };

  return (
    <div
      className="video-card rounded-2xl neon-border-purple card-glass flex flex-col relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Thumbnail */}
      <div
        className="relative overflow-hidden flex-shrink-0 group-thumb"
        style={{ height: '176px', background: THUMBNAIL_COLORS[card.thumbnail] || THUMBNAIL_COLORS.default }}
      >
        {card.thumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.thumbnailUrl} alt={card.title} className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay" />
        )}
        <div className="scan-line" />
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
        >
          <span className="text-5xl mb-2" style={{ filter: 'drop-shadow(0 0 16px rgba(168,85,247,0.6))' }}>
            {THUMBNAIL_ICONS[card.thumbnail] || THUMBNAIL_ICONS.default}
          </span>
          <span className="text-xs font-mono text-gray-500 tracking-widest uppercase">{card.niche}</span>
        </div>
        
        {/* Top-left: lifespan */}
        <div className="absolute top-2 left-2 flex gap-1.5 flex-wrap pointer-events-none z-10">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${card.lifespan.type === 'evergreen' ? 'bg-emerald-900/80 border-emerald-500/50 text-emerald-300' : 'bg-orange-900/80 border-orange-500/50 text-orange-300'}`}>
            {card.lifespan.label}
          </span>
        </div>
        
        {/* Top-right: bookmark + multiplier */}
        <div className="absolute top-2 right-2 flex flex-col items-end gap-1.5 z-10">
          <button
            id={`bookmark-${card.id}`}
            onClick={handleSave}
            title={saved ? 'Salvo na Biblioteca' : 'Guardar na Biblioteca'}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer"
            style={{
              background: saved ? 'rgba(168,85,247,0.85)' : 'rgba(8,11,18,0.75)',
              border: saved ? '1px solid #a855f7' : '1px solid rgba(255,255,255,0.15)',
              boxShadow: saved ? '0 0 10px rgba(168,85,247,0.5)' : 'none',
            }}
          >
            <svg className="w-3.5 h-3.5 pointer-events-none" fill={saved ? 'white' : 'none'} stroke="white" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
          <div className="outlier-badge bg-purple-950/80 border border-purple-400/70 rounded-lg px-2.5 py-1 flex items-center gap-1 pointer-events-none">
            <span className="text-purple-300 font-black text-sm font-mono">{card.outlierMultiplier}</span>
            <span className="text-purple-400/80 text-[9px] font-mono">views/subs</span>
          </div>
        </div>

        {/* Hover overlay with play button */}
        <div className={`card-thumbnail-overlay absolute inset-0 flex flex-col items-center justify-center gap-3 transition-opacity ${hovered ? 'opacity-100' : 'opacity-0'}`} style={{ background: 'rgba(13,17,23,0.45)' }}>
          <div 
            className="bg-black/50 hover:bg-red-600/80 transition-colors border border-white/20 rounded-full px-4 py-2 backdrop-blur-md flex items-center gap-2 cursor-pointer pointer-events-auto" 
            onClick={handleOpenVideo}
          >
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            <span className="text-white text-xs font-bold">Assistir</span>
          </div>
        </div>

        {/* Duration pill */}
        <div className="absolute bottom-2 right-2 bg-black/80 border border-white/10 text-white text-[10px] font-mono px-2 py-0.5 rounded pointer-events-none">
          {card.avgView}
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 flex flex-col flex-1 gap-3">
        {/* Title + Score */}
        <div className="flex items-start gap-3">
          <div className="flex-1 flex flex-col gap-1.5 min-w-0">
            <h3 className="text-sm font-semibold text-gray-100 leading-snug line-clamp-2" title={showPtBR ? (translatedTitle || card.titlePtBR || card.title) : card.title}>
              {showPtBR ? (translatedTitle || card.titlePtBR || 'Traduzindo...') : card.title}
            </h3>
            {/* Bilingual toggle */}
            <button
              id={`toggle-idioma-${card.id}`}
              onClick={handleTranslate}
              disabled={isTranslating}
              className="inline-flex items-center gap-1 text-[10px] font-mono w-fit px-2 py-0.5 rounded-md transition-all hover:bg-white/10"
              style={{
                background: showPtBR ? 'rgba(34,211,238,0.1)' : 'rgba(255,255,255,0.04)',
                border: showPtBR ? '1px solid rgba(34,211,238,0.35)' : '1px solid rgba(255,255,255,0.08)',
                color: showPtBR ? '#22d3ee' : '#6b7280',
              }}
            >
              <svg className={`w-3 h-3 ${isTranslating ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                {isTranslating ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                )}
              </svg>
              {isTranslating ? 'Traduzindo...' : showPtBR ? '🇧🇷 PT-BR (clique para EN)' : '🌐 Ver título em PT-BR'}
            </button>
          </div>
          <ScoreRing score={card.score} />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2 mt-auto">
          {/* Canal + external link */}
          <div className="stat-pill flex items-center gap-1.5">
            <span className="text-purple-400">👤</span>
            <div className="flex-1 min-w-0">
              <div className="text-[9px] text-gray-500 uppercase tracking-wider">Canal</div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-gray-200 font-semibold truncate" title={card.channel}>{card.channel}</span>
                <a
                  id={`link-canal-${card.id}`}
                  href={card.channelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Abrir canal no YouTube"
                  className="flex-shrink-0 text-gray-600 hover:text-red-400 transition-colors"
                  onClick={e => e.stopPropagation()}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
          <div className="stat-pill flex items-center gap-1.5">
            <span className="text-emerald-400">📊</span>
            <div>
              <div className="text-[9px] text-gray-500 uppercase tracking-wider">Inscritos</div>
              <div className="text-[11px] text-gray-200 font-semibold">{card.subscribers}</div>
            </div>
          </div>
          <div className="stat-pill flex items-center gap-1.5">
            <span className="text-cyan-400">👁️</span>
            <div>
              <div className="text-[9px] text-gray-500 uppercase tracking-wider">Views</div>
              <div className="text-[11px] text-gray-200 font-semibold">{card.views}</div>
            </div>
          </div>
          <div className="stat-pill flex items-center gap-1.5">
            <span className="text-yellow-400">📅</span>
            <div>
              <div className="text-[9px] text-gray-500 uppercase tracking-wider">Data</div>
              <div className="text-[11px] text-gray-200 font-semibold">{card.publishedAt}</div>
            </div>
          </div>
          {/* Canal criado em — full width */}
          <div className="stat-pill col-span-2 flex items-center gap-1.5">
            <span className="text-violet-400">🏛️</span>
            <div>
              <div className="text-[9px] text-gray-500 uppercase tracking-wider">Canal criado em</div>
              <div className="text-[11px] text-gray-200 font-semibold font-mono">{card.channelCreatedAt}</div>
            </div>
          </div>
        </div>

        {/* CTR + VPH row */}
        <div className="flex items-center justify-between border-t border-white/5 pt-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-500 font-mono uppercase">CTR</span>
              <span className="text-xs font-bold text-emerald-400 font-mono">{card.ctr}</span>
            </div>
            <div className="w-px h-3 bg-white/10" />
            <div className="flex items-center gap-1">
              <span className="text-sm">🔥</span>
              <span className="text-xs font-black text-orange-400 font-mono">{card.vph}</span>
              <span className="text-[9px] text-gray-600 font-mono uppercase">VPH</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${card.vphRaw > 100 ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
            <span className="text-[10px] text-gray-500">{card.vphRaw > 100 ? 'Alta tração' : 'Tração normal'}</span>
          </div>
        </div>

        {/* Dynamic Action Section */}
        <div className="mt-auto flex flex-col gap-2 pt-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            disabled={isChecking}
                            className={`w-full py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest border transition-all flex items-center justify-center gap-2
                                ${isChecking 
                                    ? 'border-purple-500/40 bg-purple-950/20 text-purple-300' 
                                    : lastResult === 'Oceano Azul'
                                    ? 'border-cyan-400/50 bg-cyan-900/20 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.3)]'
                                    : lastResult === 'Saturado'
                                    ? 'border-red-500/30 bg-red-900/10 text-red-400/70 shadow-[0_0_8px_rgba(239,68,68,0.2)]'
                                    : 'border-white/10 text-gray-400 hover:text-white hover:border-purple-500/40 hover:bg-purple-950/20'
                                }`}
                        >
                            {isChecking ? (
                               <>
                                 <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                                 Analisando {selectedMarket && MARKETS.find(m => m.code === selectedMarket)?.label}...
                               </>
                            ) : (
                               <>
                                 <span>🌍</span>
                                 Analisar Mercados
                                 <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                   <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                 </svg>
                               </>
                            )}
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                        className="w-56 border-purple-500/20 bg-[#0d1117]/95 backdrop-blur-xl"
                        sideOffset={5}
                        align="start"
                    >
                        <DropdownMenuLabel className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">
                            Idiomas Alto RPM
                        </DropdownMenuLabel>
                        {MARKETS.map((market) => (
                            <DropdownMenuItem
                                key={market.code}
                                onClick={() => handleCheckMarket(market)}
                                disabled={isChecking}
                                className="cursor-pointer hover:bg-purple-950/30 focus:bg-purple-950/30"
                            >
                                <span className="text-base mr-2">{market.flag}</span>
                                <span className="text-xs font-mono text-gray-300 flex-1">{market.label}</span>
                                <span className="text-[9px] font-mono text-gray-600 uppercase">{market.code}</span>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            
            {(statusPt || statusEs) && (
                <div className="flex items-center justify-center gap-3 py-1">
                    {statusPt && (
                        <div className={`text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border inline-flex items-center gap-1.5 transition-all duration-500
                            ${statusPt === 'Oceano Azul' 
                                ? 'bg-cyan-900/20 border-cyan-400/50 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.3)] animate-pulse' 
                                : 'bg-red-900/10 border-red-500/20 text-red-400/70 shadow-[0_0_8px_rgba(239,68,68,0.2)]'
                            }`}>
                            🇧🇷 {statusPt}
                        </div>
                    )}
                    {statusPt && statusEs && <div className="w-px h-3 bg-white/10" />}
                    {statusEs && (
                        <div className={`text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border inline-flex items-center gap-1.5 transition-all duration-500
                            ${statusEs === 'Oceano Azul' 
                                ? 'bg-cyan-900/20 border-cyan-400/50 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.3)] animate-pulse' 
                                : 'bg-red-900/10 border-red-500/20 text-red-400/70 shadow-[0_0_8px_rgba(239,68,68,0.2)]'
                            }`}>
                            🇲🇽 {statusEs}
                        </div>
                    )}
                </div>
            )}
            
            <button
                id={`gerar-roteiro-${card.id}`}
                onClick={() => {
                    setClicked(true);
                    window.open(`/hook?title=${encodeURIComponent(card.title)}&market=${encodeURIComponent(targetMarket)}`, '_blank');
                    setTimeout(() => setClicked(false), 2000);
                }}
                className="btn-primary w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {clicked ? 'Redirecionando...' : btnText}
            </button>
        </div>
      </div>
    </div>
  );
}

export default function DarkMinePage() {
  const [activeNiche, setActiveNiche] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [maxSubs, setMaxSubs] = useState('50000');
  const [mining, setMining] = useState(false);
  const [mined, setMined] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [postFilter, setPostFilter] = useState<'Todos' | 'Evergreen' | 'Hype'>('Todos');
  const [errorMsg, setErrorMsg] = useState('');
  const [cards, setCards] = useState<any[]>(MOCK_CARDS);
  const [libraryCount, setLibraryCount] = useState(0);

  useEffect(() => {
      const updateCount = () => {
          const lib = JSON.parse(localStorage.getItem('darkmine_library') || '[]');
          setLibraryCount(lib.filter((c: any) => c.libraryStatus === 'Pendente').length);
      };
      updateCount();
      window.addEventListener('libraryUpdated', updateCount);
      return () => window.removeEventListener('libraryUpdated', updateCount);
  }, []);

  const displayCards = [...cards].filter(c => {
      const now = new Date();
      const pubDate = new Date(c.publishedAtRaw || 0);
      const daysOld = (now.getTime() - pubDate.getTime()) / (1000 * 3600 * 24);
      if (postFilter === 'Evergreen') return daysOld > 30;
      if (postFilter === 'Hype') return daysOld < 14;
      return true;
  }).sort((a, b) => {
      if (postFilter === 'Hype') return (b.vphRaw || 0) - (a.vphRaw || 0);
      return (b.outlierMultiplierRaw || 0) - (a.outlierMultiplierRaw || 0);
  });

  const handleMine = async () => {
    if (!searchQuery && activeNiche === 'Todos') {
      setErrorMsg('Por favor, digite uma palavra-chave ou escolha um nicho específico.');
      return;
    }

    setMining(true);
    setMined(false);
    setErrorMsg('');

    try {
      const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
      if (!apiKey) {
        throw new Error("Chave de API do YouTube não configurada em .env.local");
      }

      const nicheMapping: Record<string, string> = {
        'Finanças': 'personal finance OR investing OR money',
        'True Crime': 'true crime OR unsolved mystery',
        'Tech': 'technology OR artificial intelligence',
        'História': 'history documentary OR historical facts',
        'Psicologia': 'psychology OR body language',
        'Geopolítica': 'geopolitics OR global economy',
        'Estoicismo': 'stoicism OR philosophy',
        'Espaço/Ciência': 'space documentary OR universe discovery',
        'Todos': 'viral documentary OR story time OR case study'
      };

      const q = searchQuery || nicheMapping[activeNiche] || activeNiche;
      
      // 1. Pesquisa (até 100 resultados via paginação)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const publishedAfterStr = sixMonthsAgo.toISOString();
      
      let allSearchItems: any[] = [];
      let nextPageToken = '';
      
      for (let i = 0; i < 2; i++) {
          const pageTokenParam = nextPageToken ? `&pageToken=${nextPageToken}` : '';
          const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=50&q=${encodeURIComponent(q)}&type=video&regionCode=US&relevanceLanguage=en&publishedAfter=${publishedAfterStr}${pageTokenParam}&key=${apiKey}`);
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

      // 2. Obter estatísticas dos vídeos em lotes de 50
      let allVideosData: any[] = [];
      for (let i = 0; i < videoIdsArr.length; i += 50) {
          const batch = videoIdsArr.slice(i, i + 50).join(',');
          const videosRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet&id=${batch}&key=${apiKey}`);
          const videosData = await videosRes.json();
          if (videosData.items) allVideosData.push(...videosData.items);
      }

      // 3. Obter estatísticas dos canais em lotes de 50
      let allChannelsData: any[] = [];
      for (let i = 0; i < channelIdsArr.length; i += 50) {
          const batch = channelIdsArr.slice(i, i + 50).join(',');
          const channelsRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${batch}&key=${apiKey}`);
          const channelsData = await channelsRes.json();
          if (channelsData.items) allChannelsData.push(...channelsData.items);
      }

      const now = new Date();
      const results: any[] = [];
      const limitSubs = parseInt(maxSubs, 10) || 50000;

      for (const video of allVideosData) {
        const channel = allChannelsData.find((c: any) => c.id === video.snippet.channelId);
        if (!channel) continue;

        // Trava de Formato: Remover Shorts (duração < 3 min ou contendo #shorts)
        const durationStr = video.contentDetails?.duration || '';
        const durationMatch = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        let totalSeconds = 0;
        if (durationMatch) {
            const h = parseInt(durationMatch[1] || '0', 10);
            const m = parseInt(durationMatch[2] || '0', 10);
            const s = parseInt(durationMatch[3] || '0', 10);
            totalSeconds = h * 3600 + m * 60 + s;
        }
        if (totalSeconds < 180) continue;

        const titleLower = (video.snippet?.title || '').toLowerCase();
        const descLower = (video.snippet?.description || '').toLowerCase();
        if (titleLower.includes('#shorts') || descLower.includes('#shorts')) continue;

        const subsRaw = parseInt(channel.statistics?.subscriberCount || '0', 10);
        if (subsRaw > limitSubs) continue;

        const viewsRaw = parseInt(video.statistics?.viewCount || '0', 10);
        const multiplierRaw = subsRaw > 0 ? viewsRaw / subsRaw : (viewsRaw > 0 ? viewsRaw : 0);
        
        const publishedAt = new Date(video.snippet.publishedAt);
        const hoursSincePublished = Math.max((now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60), 1);
        const vphRaw = viewsRaw / hoursSincePublished;

        const isBlueOcean = multiplierRaw > 5;
        const isHype = hoursSincePublished < 24 * 7 && vphRaw > 500;
        
        // Calcular CTR fictício baseado no multiplier
        const ctrMock = Math.min(5 + multiplierRaw * 0.5, 18).toFixed(1) + '%';

        results.push({
          id: video.id,
          title: video.snippet.title,
          titlePtBR: "",
          channel: channel.snippet.title,
          channelUrl: `https://www.youtube.com/channel/${channel.id}`,
          channelCreatedAt: new Date(channel.snippet.publishedAt).getFullYear().toString(),
          subscribers: formatNumber(subsRaw),
          views: formatNumber(viewsRaw),
          publishedAt: publishedAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
          publishedAtRaw: publishedAt,
          outlierMultiplier: multiplierRaw.toFixed(1) + 'x',
          outlierMultiplierRaw: multiplierRaw,
          viewsRaw: viewsRaw,
          thumbnail: getThumbnailType(activeNiche),
          thumbnailUrl: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url || '',
          lifespan: isHype 
            ? { type: "hype", label: "🔥 Hype / Curto Prazo" } 
            : { type: "evergreen", label: "🌲 Evergreen / Perene" },
          statusPt: 'Analisando...',
          statusEs: 'Analisando...',
          niche: activeNiche === 'Todos' ? 'Geral' : activeNiche,
          ctr: ctrMock,
          avgView: parseDuration(video.contentDetails?.duration),
          score: formatScore(multiplierRaw, vphRaw),
          vph: formatNumber(vphRaw),
          vphRaw: vphRaw,
          videoUrl: `https://www.youtube.com/watch?v=${video.id}`,
        });

      }

      if (results.length === 0) {
          throw new Error(`Nenhum vídeo passou no filtro de < ${limitSubs} inscritos. Tente aumentar o limite.`);
      }

      // Ordenar resultados brutos por multiplicador e pegar os top 18
      const bestResults = results.sort((a, b) => {
        return (b.outlierMultiplierRaw || 0) - (a.outlierMultiplierRaw || 0);
      }).slice(0, 18);

      for (const res of bestResults) {
          res.statusPt = null;
          res.statusEs = null;
      }

      setCards(bestResults);
      setMined(true);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro desconhecido ao minerar dados');
    } finally {
      setMining(false);
    }
  };

  return (
    <div className="min-h-screen grid-bg relative overflow-x-hidden">
      {/* Ambient glow blobs */}
      <div className="fixed top-0 left-1/4 w-96 h-96 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      <div className="fixed bottom-1/4 right-1/4 w-80 h-80 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.05) 0%, transparent 70%)', filter: 'blur(40px)' }} />

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 border-b border-white/5" style={{ background: 'rgba(8,11,18,0.85)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', boxShadow: '0 0 16px rgba(168,85,247,0.5)' }}>
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-gradient-purple">DarkMine</span>
              <span className="ml-2 text-[10px] font-mono text-purple-500/70 uppercase tracking-widest hidden sm:inline">Intelligence</span>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <Link href="/library" className="relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-300 border border-white/10 transition-all hover:border-purple-500/40 hover:text-purple-300 hover:bg-purple-950/20">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              Biblioteca
              {libraryCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-purple-600 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-gray-900 shadow-[0_0_8px_rgba(168,85,247,0.6)]">
                      {libraryCount}
                  </span>
              )}
            </Link>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-mono text-emerald-400">API Conectada</span>
            </div>
            <button
              id="btn-configuracoes"
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-300 border border-white/10 transition-all hover:border-purple-500/40 hover:text-purple-300 hover:bg-purple-950/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Configurações
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-10">

        {/* ── SEARCH & CONTROL AREA ── */}
        <section className="rounded-2xl p-6 space-y-5 neon-border-purple card-glass relative">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #a855f7, #7c3aed)' }} />
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-widest">Motor de Mineração</h2>
          </div>

          {/* Search row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
              </svg>
              <input
                id="campo-pesquisa"
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleMine()}
                placeholder="Ex: conspiracy, finance collapse, true crime cold case..."
                className="input-dark w-full pl-10 pr-4 py-3 rounded-xl text-sm font-mono"
              />
            </div>
            <div className="relative sm:w-52">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
              </svg>
              <input
                id="campo-limite-inscritos"
                type="number"
                value={maxSubs}
                onChange={e => setMaxSubs(e.target.value)}
                placeholder="Max Inscritos"
                className="input-dark w-full pl-10 pr-4 py-3 rounded-xl text-sm font-mono"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-600 font-mono">subs</span>
            </div>
          </div>

          {/* Niche filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-600 font-mono uppercase tracking-wider mr-1">Nicho:</span>
            {NICHES.map(n => (
              <button
                key={n}
                id={`filtro-${n.toLowerCase().replace(' ', '-')}`}
                onClick={() => setActiveNiche(n)}
                className={`tag-filter px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${activeNiche === n ? 'active' : 'border-white/10 text-gray-400'}`}
              >
                {n}
              </button>
            ))}
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="bg-red-950/50 border border-red-500/50 text-red-200 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {errorMsg}
            </div>
          )}

          {/* Mine button + Sort dropdown */}
          <div className="flex gap-3 items-stretch">
            <button
              id="btn-minerar"
              onClick={handleMine}
              disabled={mining}
              className="btn-primary flex-1 py-4 rounded-xl text-base font-black text-white flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {mining ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Minerando Oportunidades...
                </>
              ) : mined ? (
                <>✅ {cards.length} Outliers Encontrados — Minerar Novamente</>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Minerar Oportunidades
                </>
              )}
            </button>
            {/* Post-Search Filters */}
            <div className="flex bg-black/40 border border-white/10 rounded-xl p-1 gap-1">
              {['Todos', 'Evergreen', 'Hype'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setPostFilter(filter as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${postFilter === filter ? 'bg-purple-600/20 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.1)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                  {filter === 'Evergreen' && '🌲 '}
                  {filter === 'Hype' && '🔥 '}
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── TRENDING OUTLIERS ── */}
        <section>
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-white">
                🔥 <span className="text-gradient-purple">Trending Outliers</span>
                <span className="text-gray-400 font-normal text-base ml-2">(Oportunidades do Dia)</span>
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-400" style={{ animation: 'blink 1.5s ease-in-out infinite' }} />
              <span className="text-xs font-mono text-gray-500">Live · Atualizado Agora</span>
            </div>
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {displayCards.map(card => (
              <VideoCard key={card.id} card={card} />
            ))}
          </div>
          
          {cards.length === 0 && !mining && (
            <div className="py-20 text-center flex flex-col items-center gap-3 opacity-60">
              <span className="text-4xl">🕵️</span>
              <p className="text-gray-400 font-mono text-sm">Nenhum resultado. Realize uma mineração acima.</p>
            </div>
          )}
        </section>

        {/* ── BOTTOM HINT ── */}
        <div className="flex items-center justify-center gap-2 pb-6 opacity-40">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs text-gray-600 font-mono">DarkMine v1.0 Alpha · Conectado à API do YouTube</span>
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setShowSettings(false)}>
          <div className="rounded-2xl p-6 w-full max-w-md neon-border-purple card-glass" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Configurações
            </h3>
            <div className="space-y-4">
              {[
                { label: 'YouTube Data API Key', placeholder: 'AIza...', type: 'password', defaultValue: process.env.NEXT_PUBLIC_YOUTUBE_API_KEY ? '********' : '' },
                { label: 'OpenAI API Key (roteiros)', placeholder: 'sk-...', type: 'password' },
                { label: 'Idioma Alvo', placeholder: 'pt-BR', type: 'text' },
              ].map(field => (
                <div key={field.label}>
                  <label className="block text-xs text-gray-500 font-mono uppercase tracking-wider mb-1.5">{field.label}</label>
                  <input type={field.type} placeholder={field.placeholder} defaultValue={field.defaultValue} className="input-dark w-full px-4 py-2.5 rounded-xl text-sm font-mono" />
                </div>
              ))}
              <button className="btn-primary w-full py-3 rounded-xl text-sm font-bold text-white mt-2" onClick={() => setShowSettings(false)}>
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
