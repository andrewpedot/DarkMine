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
import { searchVideos } from './actions/search-videos';



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

interface AnalyzedMarket {
  langCode: string;
  status: 'blue_ocean' | 'saturated';
  analysis?: string;
}

function VideoCard({ card }: { card: any }) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return Math.round(num).toString();
  };

  return (
    <div className="rounded-2xl bg-gray-900 border border-purple-500/30 overflow-hidden flex flex-col shadow-lg shadow-purple-900/20">
      {/* Topo: Thumbnail */}
      <div className="relative w-full h-48 bg-gray-800">
        {card.thumbnailUrl && (
          <img src={card.thumbnailUrl} alt={card.title} className="w-full h-full object-cover" />
        )}
      </div>

      {/* Corpo */}
      <div className="p-5 flex flex-col flex-1 gap-4">
        <div>
          <h3 className="text-lg font-bold text-white line-clamp-2 leading-tight mb-1" title={card.title}>
            {card.title}
          </h3>
          <p className="text-sm text-gray-400 font-medium">👤 {card.channel}</p>
        </div>

        {/* Badges de Dados */}
        <div className="flex flex-wrap gap-2">
          {/* Badge VPD */}
          <div className="bg-orange-950/40 border border-orange-500/50 text-orange-400 px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5">
            🔥 VPD: {formatNumber(card.viewsPerDay || 0)} views/dia
          </div>
          {/* Badge IA Confirmada */}
          {card.syntheticMedia && (
            <div className="bg-green-950/40 border border-green-500/50 text-green-400 px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5">
              🤖 IA Confirmada
            </div>
          )}
          {/* Badge Anomalia */}
          <div className="bg-blue-950/40 border border-blue-500/50 text-blue-400 px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5">
            📈 Anomalia: {card.outlierMultiplier}x inscritos
          </div>
        </div>

        {/* Ações */}
        <div className="mt-auto pt-2 flex flex-col gap-2">
          <a
            href={card.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            Ver no YouTube
          </a>
          <button
            className="w-full py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-bold flex items-center justify-center gap-2 border border-white/10 transition-colors"
            onClick={() => window.open(`/hook?title=${encodeURIComponent(card.title)}&market=Brasil`, '_blank')}
          >
            📝 Extrair Roteiro
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
      const limitSubs = parseInt(maxSubs, 10) || 50000;

      const bestResults = await searchVideos(q, limitSubs, activeNiche);

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
