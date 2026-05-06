'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { sendToProduction } from '../actions/darkmine-actions';
import { NicheSelector } from '@/components/darkmine/NicheSelector';

interface Niche {
  id: number;
  name: string;
  parent_id: number | null;
  cpm_tier: number;
  is_entertainment: boolean;
  keywords: string[];
  children: Niche[];
}

interface SearchSession {
  id: string;
  name: string;
  search_type: string;
  keywords: string[];
  status: string;
  created_at: string;
  analysis_results?: { count: number }[];
  niche_filter_id: number | null;
  subniche_filter_id: number | null;
}

interface NicheLabel {
  id: number;
  name: string;
}

interface AnalysisResult {
  id: string;
  niche_id: number | null;
  subniche_id: number | null;
  opportunity_score: number;
  faceless_score: number;
  comment_gold_score: number;
  outlier_multiplier: number;
  views_per_day: number;
  score_breakdown: any;
  videos: {
    id: string;
    title: string;
    channel_name: string;
    thumbnail_url: string;
    views: number;
    published_at: string;
  };
  channels: {
    id: string;
    name: string;
    subscriber_count: number;
  };
  niches: NicheLabel[] | null;
  nichesBySubniche: NicheLabel[] | null;
}

const SEARCH_TYPES = [
  { value: 'money', label: 'Money', emoji: '💰', color: 'emerald' },
  { value: 'entertainment', label: 'Entertainment', emoji: '🎬', color: 'purple' },
  { value: 'mixed', label: 'Mixed', emoji: '⚡', color: 'cyan' },
];

function ScoreRing({ score, size = 'sm' }: { score: number; size?: 'sm' | 'md' }) {
  const r = size === 'sm' ? 14 : 20;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  
  const getColor = () => {
    if (score >= 85) return '#fbbf24';
    if (score >= 70) return '#94a3b8';
    return '#ef4444';
  };

  return (
    <svg width={size === 'sm' ? 32 : 48} height={size === 'sm' ? 32 : 48} viewBox="0 0 48 48">
      <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
      <circle
        cx="24"
        cy="24"
        r={r}
        fill="none"
        stroke={getColor()}
        strokeWidth="3"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 24 24)"
        style={{ filter: `drop-shadow(0 0 4px ${getColor()})` }}
      />
      <text x="24" y="26" textAnchor="middle" fontSize="10" fontWeight="700" fill="#e2e8f0">
        {score}
      </text>
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <svg className="animate-spin w-8 h-8" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );
}

export default function DarkMinePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'money' | 'entertainment' | 'mixed'>('mixed');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SearchSession[]>([]);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [selectedResult, setSelectedResult] = useState<AnalysisResult | null>(null);
  const [page, setPage] = useState(1);
  const [niches, setNiches] = useState<Niche[]>([]);
  const [isSendingToProd, setIsSendingToProd] = useState<string | null>(null);
  const [selectedNicheId, setSelectedNicheId] = useState<number | null>(null);
  const [selectedSubnicheId, setSelectedSubnicheId] = useState<number | null>(null);
  const [nicheKeywords, setNicheKeywords] = useState<string[]>([]);

  useEffect(() => {
    fetchSessions();
    fetchNiches();
  }, []);

  useEffect(() => {
    if (currentSessionId) {
      fetchResults(currentSessionId);
    }
  }, [currentSessionId, page]);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/darkmine/sessions');
      const data = await res.json();
      if (data.sessions) {
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const fetchNiches = async () => {
    try {
      const res = await fetch('/api/darkmine/niches');
      const data = await res.json();
      if (data.niches) {
        setNiches(data.niches);
      }
    } catch (error) {
      console.error('Failed to fetch niches:', error);
    }
  };

  const fetchResults = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/darkmine/results/${sessionId}?page=${page}&limit=10`);
      const data = await res.json();
      if (data.results) {
        setResults(data.results);
        setTotalResults(data.pagination.total);
      }
    } catch (error) {
      console.error('Failed to fetch results:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setErrorMsg('Por favor, digite uma palavra-chave.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const keywords = searchQuery.split(',').map(k => k.trim()).filter(Boolean);
      
      const res = await fetch('/api/darkmine/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionName: `${searchQuery.slice(0, 30)} - ${new Date().toLocaleDateString()}`,
          keywords,
          searchType,
          maxSubscribers: 50000,
          nicheId: selectedNicheId,
          subnicheId: selectedSubnicheId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao iniciar busca.');
      }

      setCurrentSessionId(data.sessionId);
      setPage(1);
      
      if (data.resultsCount === 0) {
        setErrorMsg('Nenhum resultado encontrado. Tente com outras palavras-chave.');
      }
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || 'Erro ao conectar com a API.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendToProduction = async (resultId: string) => {
    setIsSendingToProd(resultId);
    try {
      const res = await sendToProduction(resultId);
      if (res.success) {
        alert('Enviado para produção com sucesso!');
        router.push(`/hook?id=${res.projectId}`);
      } else {
        alert('Erro ao enviar para produção: ' + res.error);
      }
    } catch (error) {
      console.error(error);
      alert('Erro inesperado ao enviar para produção.');
    } finally {
      setIsSendingToProd(null);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getScoreClass = (score: number) => {
    if (score >= 85) return 'bg-amber-900/40 border-amber-500/50 text-amber-300';
    if (score >= 70) return 'bg-slate-800/40 border-slate-600/50 text-slate-300';
    return 'bg-red-900/20 border-red-500/30 text-red-300';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 85) return 'Gold';
    if (score >= 70) return 'Silver';
    return 'Low';
  };

  const exampleKeywords = [
    'finance investing conspiracy',
    'true crime cold case',
    'ai machine learning',
    'psychology manipulation',
    'space mystery universe',
  ];

  return (
    <div className="min-h-screen grid-bg relative overflow-x-hidden">
      <div className="fixed top-0 left-1/4 w-96 h-96 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      <div className="fixed bottom-1/4 right-1/4 w-80 h-80 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.05) 0%, transparent 70%)', filter: 'blur(40px)' }} />

      <header className="sticky top-0 z-50 border-b border-white/5" style={{ background: 'rgba(8,11,18,0.85)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', boxShadow: '0 0 16px rgba(168,85,247,0.5)' }}>
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-gradient-purple">DarkMine</span>
              <span className="ml-2 text-[10px] font-mono text-purple-500/70 uppercase tracking-widest hidden sm:inline">Research</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-300 border border-white/10 transition-all hover:border-purple-500/40 hover:text-purple-300 hover:bg-purple-950/20">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Radar
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <section className="rounded-2xl p-6 space-y-5 neon-border-purple card-glass">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #a855f7, #7c3aed)' }} />
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-widest">Oportunity Research</h2>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Ex: finance investing, true crime, ai machine learning..."
                className="input-dark w-full pl-10 pr-4 py-3 rounded-xl text-sm font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-600 font-mono uppercase tracking-wider mr-1">Tipo:</span>
            {SEARCH_TYPES.map(type => (
              <button
                key={type.value}
                onClick={() => setSearchType(type.value as any)}
                className={`tag-filter px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${searchType === type.value ? 'active' : 'border-white/10 text-gray-400'}`}
              >
                <span className="mr-1">{type.emoji}</span>
                {type.label}
              </button>
            ))}
          </div>

          <NicheSelector 
            selectedNicheId={selectedNicheId}
            selectedSubnicheId={selectedSubnicheId}
            onNicheSelect={(nicheId, subnicheId, keywords) => {
              setSelectedNicheId(nicheId);
              setSelectedSubnicheId(subnicheId);
              setNicheKeywords(keywords);
            }}
          />

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-600 font-mono uppercase tracking-wider mr-1">Sugestões:</span>
            {exampleKeywords.map(kw => (
              <button
                key={kw}
                onClick={() => setSearchQuery(kw)}
                className="px-2 py-1 rounded-md text-[10px] font-mono bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
              >
                {kw}
              </button>
            ))}
          </div>

          {errorMsg && (
            <div className="bg-red-950/50 border border-red-500/50 text-red-200 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {errorMsg}
            </div>
          )}

          <button
            onClick={handleSearch}
            disabled={loading || !searchQuery.trim()}
            className="btn-primary w-full py-4 rounded-xl text-base font-black text-white flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Pesquisando...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Buscar Oportunidades
              </>
            )}
          </button>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1 space-y-4">
            <div className="rounded-xl p-4 card-glass border border-white/5">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Sessões Anteriores</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {sessions.length === 0 ? (
                  <p className="text-xs text-gray-500 font-mono">Nenhuma sessão ainda.</p>
                ) : (
                  sessions.map(session => (
                    <button
                      key={session.id}
                      onClick={() => setCurrentSessionId(session.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        currentSessionId === session.id
                          ? 'bg-purple-900/30 border-purple-500/50'
                          : 'border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="text-xs font-semibold text-gray-200 truncate">{session.name}</div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-gray-500">{formatDate(session.created_at)}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          session.status === 'completed' ? 'bg-emerald-900/50 text-emerald-300' : 'bg-yellow-900/50 text-yellow-300'
                        }`}>
                          {session.status}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </aside>

          <section className="lg:col-span-3">
            {!currentSessionId ? (
              <div className="rounded-xl p-12 card-glass border border-white/5 text-center">
                <span className="text-4xl mb-4 block">🔍</span>
                <h3 className="text-lg font-bold text-gray-300 mb-2">Seleione uma sessão ou faça uma nova busca</h3>
                <p className="text-sm text-gray-500">Os resultados aparecerão aqui com análise de oportunidades.</p>
              </div>
            ) : results.length === 0 ? (
              <LoadingSpinner />
            ) : (
              <div className="rounded-xl card-glass border border-white/5 overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-300">Resultados ({totalResults})</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="text-xs text-gray-500 font-mono">Página {page}</span>
                    <button
                      onClick={() => setPage(p => p + 1)}
                      disabled={page * 10 >= totalResults}
                      className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-black/40">
                      <tr className="text-left text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                        <th className="p-3">Score</th>
                        <th className="p-3">Vídeo</th>
                        <th className="p-3">Canal</th>
                        <th className="p-3">Nichos</th>
                        <th className="p-3">Outlier</th>
                        <th className="p-3">VPD</th>
                        <th className="p-3">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {results.map((result, idx) => {
                        const nicheData = result.niches?.[0];
                        const subnicheData = result.nichesBySubniche?.[0];
                        const displayNiche = subnicheData?.name || nicheData?.name;
                        const nichePath = nicheData?.name && subnicheData?.name 
                          ? `${nicheData.name} > ${subnicheData.name}`
                          : nicheData?.name || '';
                        
                        return (
                        <tr
                          key={result.id || idx}
                          className={`transition-colors hover:bg-white/5 ${selectedResult?.id === result.id ? 'bg-purple-900/20' : ''}`}
                          onClick={() => setSelectedResult(result)}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <ScoreRing score={result.opportunity_score} />
                              <div className="text-[10px]">
                                <div className={`px-2 py-0.5 rounded border ${getScoreClass(result.opportunity_score)}`}>
                                  {getScoreLabel(result.opportunity_score)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="max-w-xs">
                              <div className="text-sm font-semibold text-gray-200 truncate">{result.videos?.title || 'N/A'}</div>
                              <div className="text-[10px] text-gray-500">{result.videos?.published_at ? formatDate(result.videos.published_at) : ''}</div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="text-sm text-gray-300">{result.channels?.name || 'N/A'}</div>
                            <div className="text-[10px] text-gray-500">{formatNumber(result.channels?.subscriber_count || 0)} subs</div>
                          </td>
                          <td className="p-3">
                            {displayNiche ? (
                              <div title={nichePath} className="text-xs px-2 py-1 rounded-full bg-gray-800 text-green-400 border border-green-500/30 max-w-[120px] truncate">
                                {displayNiche}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-500">-</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="text-sm font-bold text-purple-400 font-mono">
                              {result.outlier_multiplier ? `${result.outlier_multiplier}x` : 'N/A'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="text-sm text-gray-300 font-mono">{formatNumber(result.views_per_day || 0)}/d</span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (result.videos?.id) {
                                    window.open(`https://www.youtube.com/watch?v=${result.videos.id}`, '_blank');
                                  }
                                }}
                                className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-purple-500/40"
                                title="Abrir no YouTube"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </button>
                              <Link
                                href={`/hook?title=${encodeURIComponent(result.videos?.title || '')}&id=${result.id}`}
                                className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-emerald-400 hover:border-emerald-500/40"
                                title="Clonar para Hook"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </Link>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSendToProduction(result.id);
                                }}
                                disabled={isSendingToProd === result.id}
                                className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-amber-400 hover:border-amber-500/40 disabled:opacity-50"
                                title="Enviar para Produção"
                              >
                                {isSendingToProd === result.id ? (
                                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {selectedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setSelectedResult(null)}>
          <div className="rounded-2xl p-6 w-full max-w-lg neon-border-purple card-glass" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Score Breakdown</h3>
              <button onClick={() => setSelectedResult(null)} className="text-gray-500 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                <div className="text-[10px] text-gray-500 uppercase mb-1">Faceless Score</div>
                <div className="text-2xl font-bold text-purple-400">{selectedResult.faceless_score}</div>
              </div>
              <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                <div className="text-[10px] text-gray-500 uppercase mb-1">Comment Gold</div>
                <div className="text-2xl font-bold text-cyan-400">{selectedResult.comment_gold_score}</div>
              </div>
              <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                <div className="text-[10px] text-gray-500 uppercase mb-1">Final Score</div>
                <div className="text-2xl font-bold text-amber-400">{selectedResult.opportunity_score}</div>
              </div>
              <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                <div className="text-[10px] text-gray-500 uppercase mb-1">Outlier Multiplier</div>
                <div className="text-2xl font-bold text-emerald-400">{selectedResult.outlier_multiplier}x</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-xs text-gray-500 uppercase mb-2">Título</div>
                <p className="text-sm text-gray-200">{selectedResult.videos?.title}</p>
              </div>

              {selectedResult.comment_gold_score > 0 && (
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-2">Comment Summary</div>
                  <div className="text-sm text-cyan-300 bg-cyan-950/20 p-3 rounded-lg border border-cyan-500/30">
                    <span className="mr-2">✨</span>
                    Este vídeo possui alto engajamento emocional. Os comentários indicam que a audiência está pedindo por mais detalhes sobre este tópico específico.
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => handleSendToProduction(selectedResult.id)}
                disabled={isSendingToProd === selectedResult.id}
                className="flex-[2] py-2 rounded-lg text-sm font-black text-center btn-primary flex items-center justify-center gap-2"
              >
                {isSendingToProd === selectedResult.id ? 'Enviando...' : '🚀 Enviar para Produção'}
              </button>
              <button
                onClick={() => {
                  if (selectedResult.videos?.id) {
                    window.open(`https://www.youtube.com/watch?v=${selectedResult.videos.id}`, '_blank');
                  }
                }}
                className="flex-1 py-2 rounded-lg text-sm font-semibold bg-white/10 border border-white/20 text-white hover:bg-white/20"
              >
                YouTube
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-2 pb-6 opacity-40">
        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-xs text-gray-600 font-mono">DarkMine Research v1.0</span>
      </div>
    </div>
  );
}