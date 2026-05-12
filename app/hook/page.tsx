'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { generateHooks } from '../actions/generate-hooks';
import { generateThumbPrompt } from '../actions/generate-thumb';
import { saveTitleToProject } from '../actions/save-title';
import type { Channel } from '../../types/database';

// Lista de idiomas de Alto RPM
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
  { code: 'pt', label: 'Português', flag: '🇧🇷', region: 'BR', lang: 'pt' },
];

export default function DarkHookPage() {
    const router = useRouter();
    const [titleInput, setTitleInput] = useState('');
    const [market, setMarket] = useState('Alemão (DE)');
    const [isGenerating, setIsGenerating] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const [results, setResults] = useState<{
        analise_psicologica: string;
        variacoes: Array<{ titulo: string, emocao: string, ctr_estimado: number }>;
    } | null>(null);
    const [expandedPromptId, setExpandedPromptId] = useState<number | null>(null);
    const [thumbPrompts, setThumbPrompts] = useState<Record<number, string>>({});
    const [isGeneratingThumb, setIsGeneratingThumb] = useState<number | null>(null);
    const [copiedPromptId, setCopiedPromptId] = useState<number | null>(null);
    const [currentProjectId, setCurrentProjectId] = useState<string>('');
    const [errorMsg, setErrorMsg] = useState('');
    const [channels, setChannels] = useState<Channel[]>([]);
    const [selectedChannelId, setSelectedChannelId] = useState('');
    const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
    const [refTitlesExpanded, setRefTitlesExpanded] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const t = params.get('title');
        const m = params.get('market');
        const id = params.get('id');
        if (t) setTitleInput(t);
        if (m) setMarket(m);
        if (id) setCurrentProjectId(id);
    }, []);

    useEffect(() => {
        fetch('/api/channels')
            .then(r => r.json())
            .then(j => setChannels((j.channels || []).filter((c: Channel) => c.status === 'ativo')))
            .catch(() => {});
    }, []);

    const handleChannelSelect = (channelId: string) => {
        setSelectedChannelId(channelId);
        setRefTitlesExpanded(false);
        if (!channelId) { setSelectedChannel(null); return; }
        const ch = channels.find(c => c.id === channelId) ?? null;
        console.log('Canal selecionado:', ch);
        console.log('ref_titles:', ch?.ref_titles);
        console.log('ref_titles type:', typeof ch?.ref_titles, Array.isArray(ch?.ref_titles));
        setSelectedChannel(ch);
    };

    const handleGenerate = async () => {
        if (!titleInput.trim()) return;
        setIsGenerating(true);
        setShowResults(false);
        setErrorMsg('');

        try {
            const data = await generateHooks(
                titleInput,
                market,
                currentProjectId || undefined,
                selectedChannel?.niche,
                selectedChannel?.sub_niche,
                selectedChannel?.ref_titles,
            );
            
            if (!data.success) {
                setErrorMsg(data.error || "Erro ao gerar variações.");
                setIsGenerating(false);
                return;
            }

            setResults(data);
            if (data.projectId) {
                setCurrentProjectId(data.projectId);
            }
            setShowResults(true);
        } catch (error: any) {
            console.error(error);
            setErrorMsg("Erro crítico: Verifique sua conexão e a chave da API.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = (id: number, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleSaveAndComplete = async (generatedTitle: string, redirectToScript: boolean = false) => {
        if (!currentProjectId) {
            alert('Erro: Projeto não encontrado. Gere os hooks primeiro.');
            return;
        }
        try {
            await saveTitleToProject(currentProjectId, generatedTitle);
            if (redirectToScript) {
                router.push(`/script?title=${encodeURIComponent(generatedTitle)}&id=${currentProjectId}`);
            } else {
                alert('Título salvo com sucesso!');
                router.push('/library');
            }
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar título.');
        }
    };

    const handleGenerateThumb = async (id: number, title: string) => {
        if (thumbPrompts[id]) {
            setExpandedPromptId(expandedPromptId === id ? null : id);
            return;
        }

        setIsGeneratingThumb(id);
        setExpandedPromptId(id);
        try {
            const prompt = await generateThumbPrompt(title);
            setThumbPrompts(prev => ({ ...prev, [id]: prompt }));
        } catch (error) {
            console.error(error);
            setExpandedPromptId(null);
        } finally {
            setIsGeneratingThumb(null);
        }
    };

    const handleCopyPrompt = (id: number, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedPromptId(id);
        setTimeout(() => setCopiedPromptId(null), 2000);
    };

    return <div className="min-h-screen grid-bg relative overflow-x-hidden text-gray-200">
            {/* Ambient glow blobs */}
            <div className="fixed top-0 left-1/4 w-96 h-96 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)', filter: 'blur(40px)' }} />
            <div className="fixed bottom-1/4 right-1/4 w-80 h-80 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(5,150,105,0.05) 0%, transparent 70%)', filter: 'blur(40px)' }} />

            {/* HEADER */}
            <header className="sticky top-0 z-50 border-b border-white/5" style={{ background: 'rgba(8,11,18,0.85)', backdropFilter: 'blur(20px)' }}>
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 0 16px rgba(16,185,129,0.4)' }}>
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div>
                            <span className="text-xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-emerald-600">DarkHook</span>
                            <span className="ml-2 text-[10px] font-mono text-emerald-500/70 uppercase tracking-widest hidden sm:inline">Laboratory</span>
                        </div>
                    </div>

                    {/* Right side */}
                    <Link href="/" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-300 border border-white/10 transition-all hover:border-emerald-500/40 hover:text-emerald-300 hover:bg-emerald-950/20">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Voltar ao Radar
                    </Link>
                </div>
            </header>

            {/* MAIN CONTENT */}
            <main className="max-w-7xl mx-auto px-6 py-10">
                {/* Error Banner */}
                {errorMsg && (
                    <div className="mb-6 p-4 rounded-xl bg-red-950/30 border border-red-500/50 text-red-200 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                        <span className="text-xl">⚠️</span>
                        <p className="text-sm font-medium">{errorMsg}</p>
                    </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

                    {/* LEFT COLUMN: Input Panel */}
                    <section className="rounded-2xl p-6 lg:p-8 space-y-6 card-glass sticky top-24 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.05),inset_0_0_20px_rgba(16,185,129,0.02)]">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #10b981, #059669)' }} />
                            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-widest">Configuração do Hook</h2>
                        </div>

                        {/* Canal Select */}
                        {channels.length > 0 && (
                            <div>
                                <label className="block text-xs text-gray-500 font-mono uppercase tracking-wider mb-2">Canal (opcional)</label>
                                <div className="relative">
                                    <select
                                        value={selectedChannelId}
                                        onChange={e => handleChannelSelect(e.target.value)}
                                        className="input-dark w-full pl-4 pr-10 py-2.5 rounded-xl text-sm appearance-none"
                                    >
                                        <option value="" className="bg-[#0d1017]">Selecionar canal</option>
                                        {channels.map(ch => (
                                            <option key={ch.id} value={ch.id} className="bg-[#0d1017]">{ch.name} — {ch.niche}</option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                                {selectedChannel && (
                                    <div className="mt-2 text-[11px] text-gray-500 font-mono flex gap-3">
                                        <span>{selectedChannel.niche}{selectedChannel.sub_niche ? ` › ${selectedChannel.sub_niche}` : ''}</span>
                                        {(selectedChannel.ref_titles?.length ?? 0) > 0 && (
                                            <span className="text-emerald-500/70">{selectedChannel.ref_titles!.length} títulos ref.</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Reference Titles from Channel */}
                        {selectedChannel && (selectedChannel.ref_titles?.length ?? 0) > 0 && (
                            <div>
                                <label className="block text-xs text-gray-500 font-mono uppercase tracking-wider mb-2">
                                    Títulos de Referência do Canal
                                </label>
                                <div className="rounded-xl border border-white/10 overflow-hidden">
                                    {(refTitlesExpanded
                                        ? selectedChannel.ref_titles!
                                        : selectedChannel.ref_titles!.slice(0, 3)
                                    ).map((title, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setTitleInput(title)}
                                            className="w-full text-left px-3 py-2.5 text-[12px] text-gray-300 hover:bg-emerald-950/40 hover:text-emerald-300 transition-colors border-b border-white/[0.06] last:border-b-0 font-mono leading-snug"
                                        >
                                            {title}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center justify-between mt-1.5">
                                    <p className="text-[10px] text-gray-600">Clique em um título para usar como base</p>
                                    {(selectedChannel.ref_titles?.length ?? 0) > 3 && (
                                        <button
                                            onClick={() => setRefTitlesExpanded(prev => !prev)}
                                            className="text-[10px] text-emerald-500/70 hover:text-emerald-400 font-mono uppercase tracking-wider transition-colors"
                                        >
                                            {refTitlesExpanded
                                                ? '▲ Ver menos'
                                                : `▼ Ver todos (${selectedChannel.ref_titles!.length})`}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Original Title Textarea */}
                        <div>
                            <label className="block text-xs text-gray-500 font-mono uppercase tracking-wider mb-2">Título Original (Inglês)</label>
                            <textarea
                                value={titleInput}
                                onChange={(e) => setTitleInput(e.target.value)}
                                placeholder="Ex: I Infiltrated the World's Most Secretive Financial Cults..."
                                className="input-dark w-full px-4 py-4 rounded-xl text-sm font-mono min-h-[120px] resize-none focus:ring-emerald-500/50"
                            />
                        </div>

                        {/* Selectors */}
                        <div>
                            <label className="block text-xs text-gray-500 font-mono uppercase tracking-wider mb-2">Mercado Alvo</label>
                            <div className="relative">
                                <select
                                    value={market}
                                    onChange={(e) => setMarket(e.target.value)}
                                    className="input-dark w-full pl-4 pr-10 py-3 rounded-xl text-sm font-semibold appearance-none"
                                >
                                    {MARKETS.map((m) => (
                                        <option key={m.code} value={`${m.label} (${m.code.toUpperCase()})`}>
                                            {m.flag} {m.label} ({m.code.toUpperCase()})
                                        </option>
                                    ))}
                                </select>
                                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>

                        {/* Generate Button */}
                        <button
                            onClick={handleGenerate}
                            disabled={!titleInput.trim() || isGenerating}
                            className="w-full py-4 rounded-xl text-sm font-black text-white flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                            style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
                        >
                            {/* Glow effect */}
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />

                            {isGenerating ? (
                                <>
                                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Processando Ganchos...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414 0 4.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                    </svg>
                                    Clonar e Adaptar Título
                                </>
                            )}
                        </button>
                    </section>

                    {/* RIGHT COLUMN: Results Panel */}
                    <section className={`transition-all duration-700 ${showResults ? 'opacity-100 translate-y-0' : 'opacity-30 translate-y-4 pointer-events-none'}`}>

                        {/* Psychological Analysis Panel */}
                        <div className="rounded-xl p-4 mb-6 border border-emerald-500/20 bg-emerald-950/20 flex items-start gap-4">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-900/50 flex-shrink-0">
                                <span className="text-xl">🧠</span>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-1">Análise Psicológica</h4>
                                <p className="text-sm font-semibold text-gray-200 mt-2">
                                    {results?.analise_psicologica || 'Processando análise...'}
                                </p>
                            </div>
                        </div>

                        {/* Results Header */}
                        <div className="flex items-center justify-between mb-4 px-1">
                            <h3 className="text-sm font-semibold text-white">Variações de Alta Conversão</h3>
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded border border-emerald-500/30">
                                {results?.variacoes?.length || 0} Resultados
                            </span>
                        </div>

                        {/* Suggestion Cards */}
                        <div className="space-y-4">
                            {results?.variacoes?.map((item, index) => {
                                const isCloneCultural = index === 0;
                                return (
                                    <div key={index} className={`rounded-xl p-5 card-glass border transition-all group flex flex-col gap-4 ${isCloneCultural ? 'border-emerald-500/50 bg-emerald-900/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'border-white/5 hover:border-emerald-500/30'}`}>
                                        <div className="flex items-start gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-[10px] font-mono text-gray-500">Var #{index + 1}</span>
                                                    <span className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${isCloneCultural ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-white/5 text-gray-400 border-white/10'}`}>
                                                        {item.emocao}
                                                    </span>
                                                </div>
                                                <h4 className={`text-base font-bold leading-snug transition-colors ${isCloneCultural ? 'text-white' : 'text-gray-100 group-hover:text-emerald-300'}`}>
                                                    {item.titulo}
                                                </h4>
                                            </div>
                                            {/* Badge Força do Clique */}
                                            <div className={`flex flex-col items-center justify-center p-2 rounded-lg border flex-shrink-0 min-w-[60px] ${isCloneCultural ? 'bg-emerald-500/20 border-emerald-400/50' : 'bg-emerald-950/30 border-emerald-500/20'}`}>
                                                <span className="text-sm font-black text-emerald-400 font-mono">{item.ctr_estimado}%</span>
                                                <span className="text-[8px] uppercase tracking-wider text-emerald-600/80 font-bold text-center mt-0.5">CTR<br />Est.</span>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 mt-2">
                                            <button
                                                onClick={() => handleCopy(index, item.titulo)}
                                                className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold border border-white/10 text-gray-300 hover:bg-white/5 transition-all"
                                            >
                                                {copiedId === index ? (
                                                    <>
                                                        <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                        Copiado!
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                        Copiar Título
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => handleGenerateThumb(index, item.titulo)}
                                                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold border transition-all ${expandedPromptId === index ? 'bg-white/10 border-white/20 text-white' : 'border-white/10 text-gray-300 hover:bg-white/5'}`}
                                            >
                                                {isGeneratingThumb === index ? (
                                                    <>
                                                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                                        Gerando...
                                                    </>
                                                ) : (
                                                    <>🎨 Prompt de Thumb</>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => handleSaveAndComplete(item.titulo, false)}
                                                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all"
                                            >
                                                ✅ Concluir
                                            </button>
                                             <button
                                                 onClick={() => handleSaveAndComplete(item.titulo, true)}
                                                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold bg-emerald-600/90 border border-emerald-500 text-white hover:bg-emerald-500 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                                             >
                                                  ✍️ Gerar Roteiro
                                             </button>
                                              <Link
                                                  href={`/thumbnail?title=${encodeURIComponent(item.titulo)}`}
                                                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold bg-amber-600/90 border border-amber-500 text-white hover:bg-amber-500 transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                                             >
                                                  🎨 Thumbnail
                                             </Link>
                                        </div>

                                        {/* Expanded Prompt Area */}
                                        {expandedPromptId === index && (
                                            <div className="mt-1 p-3.5 rounded-xl border border-white/5 bg-black/60 transition-all animate-in fade-in slide-in-from-top-2">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[9px] font-mono text-emerald-500/70 uppercase tracking-widest">Midjourney / AI Prompt</span>
                                                    {thumbPrompts[index] && (
                                                        <button onClick={() => handleCopyPrompt(index, thumbPrompts[index])} className="text-[9px] text-emerald-400 hover:text-emerald-300 font-bold px-2 py-1 rounded border border-emerald-500/30 bg-emerald-900/20 transition-colors">
                                                            {copiedPromptId === index ? 'Copiado!' : 'Copiar Prompt'}
                                                        </button>
                                                    )}
                                                </div>
                                                {isGeneratingThumb === index ? (
                                                    <div className="flex flex-col items-center justify-center py-6 gap-3 opacity-50">
                                                        <svg className="w-5 h-5 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                                        <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">Gerando...</span>
                                                    </div>
                                                ) : (
                                                    <textarea readOnly value={thumbPrompts[index] || ''} className="w-full bg-transparent border-none text-xs text-gray-300 font-mono leading-relaxed resize-none focus:ring-0 p-0 min-h-[60px]" />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                    </section>
                </div>
            </main>
        </div>
    ;
}
