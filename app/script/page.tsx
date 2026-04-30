'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { generateOutline } from '../actions/generate-outline';
import { generateAct } from '../actions/generate-act';
import { generateScenePrompts } from '../actions/generate-scene-prompts';
import { getProjectById } from '../actions/get-project';

export default function ScriptPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#080b12]" />}>
            <ScriptGenerator />
        </Suspense>
    );
}

function calculateWPMTime(text: string): { seconds: number, formatted: string } {
    if (!text) return { seconds: 0, formatted: "00:00" };
    const wordCount = text.trim().split(/\s+/).length;
    const totalSeconds = Math.round((wordCount / 150) * 60);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return {
        seconds: totalSeconds,
        formatted: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    };
}

function formatSeconds(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function ScriptGenerator() {
    const searchParams = useSearchParams();
    const initialTitle = searchParams.get('title') || '';
    const projectIdFromUrl = searchParams.get('id') || '';
    
    const [titleInput, setTitleInput] = useState(initialTitle);
    const [videoLength, setVideoLength] = useState<number>(8); // 8, 15, 25
    const [narrativeFormat, setNarrativeFormat] = useState<string>('Storytelling Viral (3 Atos)');
    const [useCulturalAdaptation, setUseCulturalAdaptation] = useState(true);
    const [market, setMarket] = useState<string>('Brasil');
    const [isGenerating, setIsGenerating] = useState(false);
    const [scriptData, setScriptData] = useState<{
        roteiro: Array<{ id?: number, fase: string, duracao_estimada?: string, status?: string, texto: string, instrucao_visual: string }>;
    } | null>(null);
    const [generatingActIndex, setGeneratingActIndex] = useState<number | null>(null);
    const [scenePrompts, setScenePrompts] = useState<Record<number, string[]>>({});
    const [isGeneratingPrompts, setIsGeneratingPrompts] = useState<number | null>(null);
    const [copiedIndex, setCopiedIndex] = useState<{ blockIndex: number; promptIndex: number } | null>(null);
    const [copiedBlockIndex, setCopiedBlockIndex] = useState<number | null>(null);

    useEffect(() => {
        if (initialTitle && !titleInput) {
            setTitleInput(initialTitle);
        }
    }, [initialTitle, titleInput]);

    useEffect(() => {
        async function loadProject() {
            if (projectIdFromUrl && !scriptData) {
                try {
                    const project = await getProjectById(projectIdFromUrl);
                    if (project) {
                        if (project.market) {
                            setMarket(project.market);
                        }
                        if (project.script_content) {
                            setScriptData(project.script_content);
                        }
                    }
                } catch (e) {
                    console.error('Erro ao carregar projeto:', e);
                }
            }
        }
        loadProject();
    }, [projectIdFromUrl]);

    const handleGenerate = async () => {
        if (!titleInput.trim()) return;
        setIsGenerating(true);
        setScriptData(null);
        try {
            const data = await generateOutline(titleInput, videoLength, narrativeFormat, useCulturalAdaptation, market, projectIdFromUrl);
            setScriptData(data);
            setScenePrompts({});
        } catch (error) {
            console.error(error);
            alert("Erro ao gerar estrutura do roteiro. Verifique o console ou a API Key.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateAct = async (index: number) => {
        if (!scriptData || !titleInput.trim()) return;
        setGeneratingActIndex(index);
        
        const block = scriptData.roteiro[index];
        const previousText = index > 0 ? scriptData.roteiro[index - 1].texto : '';

        try {
            const data = await generateAct(titleInput, block.fase, previousText, narrativeFormat, useCulturalAdaptation, market, projectIdFromUrl, scriptData);
            
            setScriptData(prev => {
                if (!prev) return prev;
                const newRoteiro = [...prev.roteiro];
                newRoteiro[index] = {
                    ...newRoteiro[index],
                    texto: data.texto,
                    instrucao_visual: data.instrucao_visual,
                    status: 'concluido'
                };
                return { ...prev, roteiro: newRoteiro };
            });
            
        } catch (error) {
            console.error(error);
            alert("Erro ao gerar ato.");
        } finally {
            setGeneratingActIndex(null);
        }
    };

    const handleGenerateScenePrompts = async (index: number, text: string) => {
        if (scenePrompts[index]) return;
        setIsGeneratingPrompts(index);
        try {
            const data = await generateScenePrompts(text);
            setScenePrompts(prev => ({ ...prev, [index]: data.prompts }));
        } catch (error) {
            console.error(error);
            alert("Erro ao gerar prompts da cena.");
        } finally {
            setIsGeneratingPrompts(null);
        }
    };

    const handleCopyAllPrompts = (prompts: string[]) => {
        navigator.clipboard.writeText(prompts.join('\n\n'));
    };

    const handleCopyPrompt = (prompt: string, blockIndex: number, promptIndex: number) => {
        navigator.clipboard.writeText(prompt);
        setCopiedIndex({ blockIndex, promptIndex });
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const handleCopyBlockText = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedBlockIndex(index);
        setTimeout(() => setCopiedBlockIndex(null), 2000);
    };

    const scriptWithTiming = useMemo(() => {
        if (!scriptData) return [];
        let runningTotal = 0;
        return scriptData.roteiro.map(block => {
            const timeInfo = calculateWPMTime(block.texto);
            const startAt = runningTotal;
            runningTotal += timeInfo.seconds;
            return {
                ...block,
                durationFormatted: timeInfo.formatted,
                startAtFormatted: formatSeconds(startAt)
            };
        });
    }, [scriptData]);

    const totalCalculatedTime = useMemo(() => {
        if (!scriptWithTiming.length) return "00:00";
        const totalSecs = scriptWithTiming.reduce((acc, curr) => acc + calculateWPMTime(curr.texto).seconds, 0);
        return formatSeconds(totalSecs);
    }, [scriptWithTiming]);

    return (
        <div className="min-h-screen bg-[#080b12] relative overflow-x-hidden text-gray-200">
            {/* Ambient glow blobs */}
            <div className="fixed top-0 left-1/4 w-96 h-96 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)', filter: 'blur(40px)' }} />

            {/* HEADER */}
            <header className="sticky top-0 z-50 border-b border-white/5" style={{ background: 'rgba(8,11,18,0.85)', backdropFilter: 'blur(20px)' }}>
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-900 border border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
                            <svg className="w-4 h-4 text-violet-300" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <div>
                            <span className="text-xl font-black tracking-tight text-white">DarkScript</span>
                            <span className="ml-2 text-[10px] font-mono text-violet-500/70 uppercase tracking-widest hidden sm:inline">Generator</span>
                        </div>
                    </div>
                    <Link href="/library" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-300 border border-white/10 transition-all hover:border-violet-500/40 hover:text-violet-300 hover:bg-violet-950/20">
                        Voltar à Biblioteca
                    </Link>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-10">
                {/* Configuration Panel */}
                <div className="rounded-2xl p-6 mb-8 border border-white/10 bg-black/40 backdrop-blur-md">
                    <div className="flex flex-col gap-8">
                        {/* Row 1: The Focus */}
                        <div className="w-full">
                            <label className="block text-xs text-gray-500 font-semibold tracking-wider uppercase mb-2">Título do Vídeo Base</label>
                            <input
                                type="text"
                                value={titleInput}
                                onChange={(e) => setTitleInput(e.target.value)}
                                placeholder="Insira o título clonado ou original..."
                                className="w-full bg-transparent border-b border-white/20 px-0 py-3 text-2xl text-white font-medium focus:outline-none focus:border-violet-500 transition-colors truncate placeholder-gray-600"
                            />
                        </div>

                        {/* Row 2: Control Panel */}
                        <div className="flex flex-col md:flex-row items-end justify-between gap-6">
                            
                            {/* Left Group */}
                            <div className="flex items-center gap-6 w-full md:w-auto">
                                {/* Formato Narrativo */}
                                <div className="flex-1 md:flex-none">
                                    <label className="block text-xs text-gray-500 font-semibold tracking-wider uppercase mb-2">Formato Narrativo</label>
                                    <select
                                        value={narrativeFormat}
                                        onChange={(e) => setNarrativeFormat(e.target.value)}
                                        className="w-full md:w-auto h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-gray-300 focus:outline-none focus:border-violet-500 transition-colors cursor-pointer appearance-none"
                                    >
                                        <option value="Storytelling Viral (3 Atos)" className="bg-gray-900">Storytelling Viral (3 Atos)</option>
                                        <option value="Documentário Histórico" className="bg-gray-900">Documentário Histórico</option>
                                    </select>
                                </div>

                                {/* Adaptação Cultural Toggle */}
                                <div className="flex-shrink-0">
                                    <label className="block text-xs text-gray-500 font-semibold tracking-wider uppercase mb-2">Adaptação</label>
                                    <label className="flex items-center cursor-pointer gap-3 h-11 px-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors group">
                                        <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">🌍</span>
                                        <div className="relative flex items-center">
                                            <input 
                                                type="checkbox" 
                                                className="sr-only" 
                                                checked={useCulturalAdaptation}
                                                onChange={(e) => setUseCulturalAdaptation(e.target.checked)}
                                            />
                                            <div className={`block w-12 h-6 rounded-full transition-colors duration-300 ${useCulturalAdaptation ? 'bg-indigo-600' : 'bg-gray-800'}`}></div>
                                            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 shadow-sm ${useCulturalAdaptation ? 'transform translate-x-6' : ''}`}></div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Right Group */}
                            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                                {/* Tamanho */}
                                <div className="w-full md:w-auto">
                                    <label className="block text-xs text-gray-500 font-semibold tracking-wider uppercase mb-2 md:text-right text-left w-full">Tamanho</label>
                                    <div className="flex bg-white/5 rounded-xl p-1 border border-white/10 w-full md:w-auto h-11 items-center">
                                        <button onClick={() => setVideoLength(8)} className={`flex-1 md:flex-none h-full px-5 rounded-lg text-xs font-bold transition-all ${videoLength === 8 ? 'bg-violet-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}>8 MIN</button>
                                        <button onClick={() => setVideoLength(15)} className={`flex-1 md:flex-none h-full px-5 rounded-lg text-xs font-bold transition-all ${videoLength === 15 ? 'bg-violet-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}>15 MIN</button>
                                        <button onClick={() => setVideoLength(25)} className={`flex-1 md:flex-none h-full px-5 rounded-lg text-xs font-bold transition-all ${videoLength === 25 ? 'bg-violet-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}>25 MIN</button>
                                    </div>
                                </div>

                                {/* Botão Gerar */}
                                <div className="w-full md:w-auto flex items-end">
                                    <button
                                        onClick={handleGenerate}
                                        disabled={!titleInput.trim() || isGenerating}
                                        className="h-11 w-full md:w-auto px-8 rounded-xl bg-violet-600 text-white text-sm font-bold transition-all hover:bg-violet-500 disabled:opacity-50 flex items-center justify-center min-w-[160px] shadow-[0_0_20px_rgba(139,92,246,0.2)] hover:shadow-[0_0_30px_rgba(139,92,246,0.4)]"
                                    >
                                        {isGenerating ? (
                                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                        ) : (
                                            'Gerar Estrutura'
                                        )}
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* Script Display */}
                {scriptWithTiming.length > 0 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="flex items-center justify-between px-2 pb-2 border-b border-white/10">
                            <h2 className="text-sm font-semibold text-gray-300">Estrutura do Roteiro</h2>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-gray-500 uppercase">Tempo Est:</span>
                                <span className="text-sm font-mono text-violet-400 font-bold bg-violet-950/30 px-2 py-0.5 rounded border border-violet-500/20">{totalCalculatedTime}</span>
                            </div>
                        </div>

                        {scriptWithTiming.map((block, index) => (
                            <div key={index} className="bg-black/40 border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-colors">
                                {/* Block Header */}
                                <div className="bg-white/5 px-5 py-3 flex items-center justify-between border-b border-white/5">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${block.status === 'pendente' ? 'bg-gray-900 border-gray-700 text-gray-500' : 'bg-violet-900/40 border-violet-500/30 text-violet-400'}`}>
                                            {index + 1}
                                        </span>
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200">{block.fase}</h3>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {block.status !== 'pendente' && (
                                            <span className="text-[10px] font-mono text-gray-500">[{block.startAtFormatted}]</span>
                                        )}
                                        <span className={`text-[10px] font-mono font-semibold px-2 py-1 rounded-md ${block.status === 'pendente' ? 'text-gray-400 bg-gray-900/50 border border-gray-700' : 'text-emerald-400 bg-emerald-950/30 border border-emerald-500/20'}`}>
                                            {block.status === 'pendente' ? block.duracao_estimada : `+${block.durationFormatted}`}
                                        </span>
                                    </div>
                                </div>

                                {/* Block Body */}
                                <div className="p-5 flex flex-col gap-4">
                                    {block.status === 'pendente' || !block.texto ? (
                                        <div className="flex justify-center py-6">
                                            <button 
                                                onClick={() => handleGenerateAct(index)}
                                                disabled={generatingActIndex === index}
                                                className="px-6 py-3 rounded-xl bg-violet-600/20 border border-violet-500/50 text-violet-300 font-bold hover:bg-violet-600/40 transition-all flex items-center gap-2"
                                            >
                                                {generatingActIndex === index ? (
                                                    <>
                                                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                                        Escrevendo...
                                                    </>
                                                ) : (
                                                    <>
                                                        ✍️ Escrever este Ato
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Text Content */}
                                            <div className="flex flex-col gap-2">
                                                <div className="flex gap-4">
                                                    <div className="w-1 bg-violet-500/20 rounded-full flex-shrink-0" />
                                                    <p className="text-sm text-gray-300 leading-relaxed font-medium whitespace-pre-wrap">
                                                        {block.texto}
                                                    </p>
                                                </div>
                                                <div className="flex justify-end pr-2 items-center gap-4">
                                                    <span className="text-xs text-gray-500 font-mono tracking-wide">
                                                        {(block.texto?.length || 0).toLocaleString('pt-BR')} caracteres
                                                    </span>
                                                    <button
                                                        onClick={() => handleCopyBlockText(block.texto, index)}
                                                        className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                                                            copiedBlockIndex === index
                                                                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                                                                : 'border-white/10 bg-white/5 text-gray-400 hover:text-white hover:border-violet-500/50 hover:bg-violet-500/10'
                                                        }`}
                                                    >
                                                        {copiedBlockIndex === index ? (
                                                            <>
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                                                Copiado!
                                                            </>
                                                        ) : (
                                                            <>
                                                                📋 Copiar Locução
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>

                                    {/* Visual Instruction */}
                                    <div className="mt-2 ml-5 p-3 rounded-xl border border-blue-500/10 bg-blue-950/10 flex gap-3 items-start">
                                        <svg className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                        <div>
                                            <span className="block text-[9px] font-mono uppercase tracking-widest text-blue-500 mb-1">Direção de Arte / B-Roll</span>
                                            <p className="text-xs text-blue-200/80 leading-relaxed">
                                                {block.instrucao_visual}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action to generate scene prompts */}
                                    <div className="mt-2 ml-5">
                                        {!scenePrompts[index] && (
                                            <button 
                                                onClick={() => handleGenerateScenePrompts(index, block.texto)}
                                                disabled={isGeneratingPrompts === index}
                                                className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-[10px] uppercase font-bold text-gray-400 hover:text-white hover:border-violet-500/50 hover:bg-violet-500/10 transition-all flex items-center gap-2 group shadow-sm active:scale-95"
                                            >
                                                {isGeneratingPrompts === index ? (
                                                    <>
                                                        <svg className="w-3.5 h-3.5 animate-spin text-violet-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                                        <span className="animate-pulse">Analisando Cena...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="group-hover:scale-125 transition-transform">🖼️</span>
                                                        Gerar Prompts de Imagem (Cena)
                                                    </>
                                                )}
                                            </button>
                                        )}

                                        {/* Expanded Prompts Area */}
                                        {scenePrompts[index] && (
                                            <div className="mt-3 p-5 rounded-2xl border border-white/10 bg-black/80 backdrop-blur-xl transition-all animate-in fade-in slide-in-from-top-4 duration-500 shadow-2xl relative overflow-hidden group/prompts">
                                                {/* Lab style background accent */}
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/5 blur-[50px] -z-10" />
                                                
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        <span className="text-[10px] font-mono text-emerald-500/80 uppercase tracking-widest font-bold">Laboratório de Prompts</span>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleCopyAllPrompts(scenePrompts[index])} 
                                                        className="text-[10px] text-gray-300 hover:text-white font-bold px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-violet-600 hover:border-violet-500 transition-all flex items-center gap-2"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                                        Copiar Todos
                                                    </button>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 gap-3">
                                                    {scenePrompts[index].map((prompt, pIdx) => {
                                                        const isCopied = copiedIndex?.blockIndex === index && copiedIndex?.promptIndex === pIdx;
                                                        return (
                                                            <div key={pIdx} className="relative p-4 rounded-xl border border-gray-800 bg-black/60 hover:border-gray-700 transition-all">
                                                                <div className="absolute top-3 right-3">
                                                                    <button 
                                                                        onClick={() => handleCopyPrompt(prompt, index, pIdx)}
                                                                        className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                                                                            isCopied 
                                                                                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                                                                                : 'border-white/10 bg-white/5 text-gray-400 hover:text-white hover:border-violet-500/50 hover:bg-violet-500/10'
                                                                        }`}
                                                                    >
                                                                        {isCopied ? (
                                                                            <>
                                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                                                                Copiado!
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                    📋 Copiar
                                                                                </>
                                                                        )}
                                                                    </button>
                                                                </div>
                                                                <textarea 
                                                                    readOnly 
                                                                    value={prompt} 
                                                                    className="w-full pr-24 bg-transparent border-none text-xs text-gray-300 font-mono leading-relaxed resize-none focus:ring-0 p-0 min-h-[60px]" 
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    </>
                                )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

export default function ScriptPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#080b12]" />}>
            <ScriptGenerator />
        </Suspense>
    );
}
