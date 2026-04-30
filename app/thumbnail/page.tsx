'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { generateThumbPrompt } from '../actions/generate-thumb';

export default function ThumbnailPage() {
    const router = useRouter();
    const [titleInput, setTitleInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<{
        emocao: string;
        conceito: string;
        tensao: string;
        prompt: string;
        promptAlt: string;
    } | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const t = params.get('title');
        if (t) setTitleInput(t);
    }, []);

    const parseResult = (text: string) => {
        const emocao = text.match(/EMOÇÃO DOMINANTE:\s*(.+)/i)?.[1]?.trim() || '';
        const conceito = text.match(/CONCEITO VISUAL:\s*(.+)/i)?.[1]?.trim() || '';
        const tensao = text.match(/ELEMENTO DE TENSÃO:\s*(.+)/i)?.[1]?.trim() || '';
        const prompt = text.match(/PROMPT EM INGLÊS:\s*([\s\S]*?)(?=PROMPT ALTERNATIVO:|$)/i)?.[1]?.trim() || '';
        const promptAlt = text.match(/PROMPT ALTERNATIVO:\s*([\s\S]*)/i)?.[1]?.trim() || '';
        return { emocao, conceito, tensao, prompt, promptAlt };
    };

    const handleGenerate = async () => {
        if (!titleInput.trim()) return;
        setIsGenerating(true);
        setResult(null);
        try {
            const text = await generateThumbPrompt(titleInput);
            setResult(parseResult(text));
        } catch (error) {
            console.error(error);
            alert('Erro ao gerar prompt da thumbnail. Verifique o console.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    return (
        <div className="min-h-screen grid-bg relative overflow-x-hidden text-gray-200">
            {/* Ambient glow blobs */}
            <div className="fixed top-0 left-1/4 w-96 h-96 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 70%)', filter: 'blur(40px)' }} />
            <div className="fixed bottom-1/4 right-1/4 w-80 h-80 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(217,119,6,0.05) 0%, transparent 70%)', filter: 'blur(40px)' }} />

            {/* HEADER */}
            <header className="sticky top-0 z-50 border-b border-white/5" style={{ background: 'rgba(8,11,18,0.85)', backdropFilter: 'blur(20px)' }}>
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 0 16px rgba(245,158,11,0.4)' }}>
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <span className="text-xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500">DarkThumb</span>
                            <span className="ml-2 text-[10px] font-mono text-amber-500/70 uppercase tracking-widest hidden sm:inline">Generator</span>
                        </div>
                    </div>

                    <Link href="/hook" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-300 border border-white/10 transition-all hover:border-amber-500/40 hover:text-amber-300 hover:bg-amber-950/20">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Voltar ao DarkHook
                    </Link>
                </div>
            </header>

            {/* MAIN CONTENT */}
            <main className="max-w-7xl mx-auto px-6 py-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

                    {/* LEFT COLUMN: Input Panel */}
                    <section className="rounded-2xl p-6 lg:p-8 space-y-6 card-glass sticky top-24 border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.05),inset_0_0_20px_rgba(245,158,11,0.02)]">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #f59e0b, #d97706)' }} />
                            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-widest">Configuração da Thumbnail</h2>
                        </div>

                        <div>
                            <label className="block text-xs text-gray-500 font-mono uppercase tracking-wider mb-2">Título do Vídeo</label>
                            <textarea
                                value={titleInput}
                                onChange={(e) => setTitleInput(e.target.value)}
                                placeholder="Cole aqui o título gerado pelo DarkHook..."
                                className="input-dark w-full px-4 py-4 rounded-xl text-sm font-mono min-h-[120px] resize-none focus:ring-amber-500/50"
                            />
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={!titleInput.trim() || isGenerating}
                            className="w-full py-4 rounded-xl text-sm font-black text-white flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                            style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)' }}
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />

                            {isGenerating ? (
                                <>
                                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Gerando Prompt...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Gerar Prompt da Thumbnail
                                </>
                            )}
                        </button>
                    </section>

                    {/* RIGHT COLUMN: Results Panel */}
                    <section className={`transition-all duration-700 ${result ? 'opacity-100 translate-y-0' : 'opacity-30 translate-y-4 pointer-events-none'}`}>
                        {result && (
                            <div className="space-y-4">
                                {/* Emotion Badge */}
                                <div className="flex items-center gap-3 px-1">
                                    <h3 className="text-sm font-semibold text-white">Resultado do Prompt</h3>
                                    <span className="text-[10px] font-mono uppercase tracking-wider px-3 py-1 rounded-full border bg-amber-900/30 text-amber-400 border-amber-500/30">
                                        {result.emocao}
                                    </span>
                                </div>

                                {/* Visual Concept */}
                                <div className="rounded-xl p-5 card-glass border-amber-500/20 bg-amber-950/10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[9px] font-mono text-amber-500 uppercase tracking-widest">Conceito Visual</span>
                                    </div>
                                    <p className="text-sm text-gray-200 font-medium leading-relaxed">{result.conceito}</p>
                                </div>

                                {/* Tension Element */}
                                <div className="rounded-xl p-5 card-glass border-amber-500/20 bg-amber-950/10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[9px] font-mono text-amber-500 uppercase tracking-widest">Elemento de Tensão</span>
                                    </div>
                                    <p className="text-sm text-gray-200 font-medium leading-relaxed">{result.tensao}</p>
                                </div>

                                {/* Main Prompt */}
                                <div className="rounded-xl p-5 card-glass border-amber-500/30 bg-amber-950/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-[9px] font-mono text-amber-400 uppercase tracking-widest">Prompt Principal (Ideogram/Midjourney)</span>
                                        <button
                                            onClick={() => handleCopy(result.prompt, 'main')}
                                            className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${copiedField === 'main' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'border-amber-500/30 bg-amber-900/20 text-amber-400 hover:bg-amber-900/40'}`}
                                        >
                                            {copiedField === 'main' ? (
                                                <>
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                                    Copiado!
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                    Copiar Prompt
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <textarea
                                        readOnly
                                        value={result.prompt}
                                        className="w-full bg-transparent border-none text-xs text-gray-300 font-mono leading-relaxed resize-none focus:ring-0 p-0 min-h-[80px]"
                                    />
                                </div>

                                {/* Alternative Prompt */}
                                <div className="rounded-xl p-5 card-glass border-amber-500/20 bg-amber-950/10">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-[9px] font-mono text-amber-500/70 uppercase tracking-widest">Prompt Alternativo</span>
                                        <button
                                            onClick={() => handleCopy(result.promptAlt, 'alt')}
                                            className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${copiedField === 'alt' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'border-amber-500/30 bg-amber-900/20 text-amber-400 hover:bg-amber-900/40'}`}
                                        >
                                            {copiedField === 'alt' ? (
                                                <>
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                                    Copiado!
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                    Copiar Prompt
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <textarea
                                        readOnly
                                        value={result.promptAlt}
                                        className="w-full bg-transparent border-none text-xs text-gray-300 font-mono leading-relaxed resize-none focus:ring-0 p-0 min-h-[80px]"
                                    />
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}
