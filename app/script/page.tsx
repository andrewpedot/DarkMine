'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import type { TimeLapseScript, TimeLapseScene } from '../actions/generate-script';

// ─── Types ────────────────────────────────────────────────────────────────────

type BlockType = 'narracao' | 'video' | 'imagem' | 'direcao';
type CopiedState = { sceneId: number; block: BlockType } | null;

// ─── Constants ────────────────────────────────────────────────────────────────

const WORD_OPTIONS = [
  { words: 1500, label: '1500 words', sublabel: '~10 min' },
  { words: 1750, label: '1750 words', sublabel: '~11.7 min' },
  { words: 2000, label: '2000 words', sublabel: '~13.3 min' },
  { words: 2250, label: '2250 words', sublabel: '~15 min' },
  { words: 2500, label: '2500 words', sublabel: '~16.7 min' },
  { words: 2750, label: '2750 words', sublabel: '~18.3 min' },
  { words: 3000, label: '3000 words', sublabel: '~20 min' },
  { words: 3250, label: '3250 words', sublabel: '~21.7 min' },
  { words: 3500, label: '3500 words', sublabel: '~23.3 min' },
  { words: 3750, label: '3750 words', sublabel: '~25 min' },
  { words: 4000, label: '4000 words', sublabel: '~26.7 min' },
  { words: 4250, label: '4250 words', sublabel: '~28.3 min' },
  { words: 4500, label: '4500 words', sublabel: '~30 min' },
] as const;

const BLOCK_CONFIG: Record<BlockType, {
  label: string;
  sublabel: string;
  borderClass: string;
  bgClass: string;
  badgeClass: string;
  textClass: string;
  icon: React.ReactNode;
}> = {
  narracao: {
    label: 'Narração',
    sublabel: 'Voz — Estilo Attenborough',
    borderClass: 'border-l-[3px] border-blue-500/70',
    bgClass: 'bg-blue-500/[0.04]',
    badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    textClass: 'text-blue-400',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
  },
  video: {
    label: 'Prompt de Vídeo',
    sublabel: 'Runway ML / Kling AI',
    borderClass: 'border-l-[3px] border-emerald-500/70',
    bgClass: 'bg-emerald-500/[0.04]',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    textClass: 'text-emerald-400',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
  imagem: {
    label: 'Prompt de Imagem',
    sublabel: 'Midjourney / Flux',
    borderClass: 'border-l-[3px] border-amber-500/70',
    bgClass: 'bg-amber-500/[0.04]',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    textClass: 'text-amber-400',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  direcao: {
    label: 'Direção',
    sublabel: 'Notas de produção',
    borderClass: 'border-l-[3px] border-violet-500/70',
    bgClass: 'bg-violet-500/[0.04]',
    badgeClass: 'bg-violet-500/15 text-violet-400 border-violet-500/25',
    textClass: 'text-violet-400',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
};

function getScenesCount(targetWords: number): number {
  if (targetWords <= 2000) return 4;
  if (targetWords <= 3000) return 6;
  if (targetWords <= 3750) return 8;
  return 9;
}

// ─── SceneBlock ───────────────────────────────────────────────────────────────

function SceneBlock({
  type,
  text,
  sceneId,
  copied,
  onCopy,
}: {
  type: BlockType;
  text: string;
  sceneId: number;
  copied: CopiedState;
  onCopy: (text: string, sceneId: number, block: BlockType) => void;
}) {
  const cfg = BLOCK_CONFIG[type];
  const isCopied = copied?.sceneId === sceneId && copied?.block === type;
  const isMono = type === 'video' || type === 'imagem';

  return (
    <div className={`rounded-xl ${cfg.borderClass} ${cfg.bgClass} px-4 py-4`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cfg.textClass}>{cfg.icon}</span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${cfg.badgeClass}`}>
            {cfg.label}
          </span>
          <span className="text-[10px] text-gray-600">{cfg.sublabel}</span>
        </div>
        <button
          onClick={() => onCopy(text, sceneId, type)}
          className={`flex-shrink-0 text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
            isCopied
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
              : 'border-white/10 bg-white/5 text-gray-400 hover:text-white hover:border-white/20 hover:bg-white/10'
          }`}
        >
          {isCopied ? (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              Copiado!
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Copiar
            </>
          )}
        </button>
      </div>
      <p className={`text-sm text-gray-300 leading-relaxed whitespace-pre-wrap ${isMono ? 'font-mono' : ''}`}>
        {text}
      </p>
    </div>
  );
}

// ─── SceneCard ────────────────────────────────────────────────────────────────

function SceneCard({
  scene,
  index,
  copied,
  onCopy,
}: {
  scene: TimeLapseScene;
  index: number;
  copied: CopiedState;
  onCopy: (text: string, sceneId: number, block: BlockType) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-black/40 border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-colors">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full bg-white/[0.03] px-5 py-3.5 flex items-center justify-between border-b border-white/5 hover:bg-white/[0.06] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black bg-white/5 border border-white/10 text-gray-400 flex-shrink-0">
            {index + 1}
          </span>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-white leading-tight">{scene.titulo_cena}</h3>
            <span className="text-[10px] font-mono text-gray-500">
              Cena {index + 1} · {scene.tempo_inicio}–{scene.tempo_fim}
            </span>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-gray-600 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="p-5 flex flex-col gap-3">
          <SceneBlock type="narracao" text={scene.narracao} sceneId={scene.id} copied={copied} onCopy={onCopy} />
          <SceneBlock type="video" text={scene.prompt_video} sceneId={scene.id} copied={copied} onCopy={onCopy} />
          <SceneBlock type="imagem" text={scene.prompt_imagem} sceneId={scene.id} copied={copied} onCopy={onCopy} />
          <SceneBlock type="direcao" text={scene.direcao} sceneId={scene.id} copied={copied} onCopy={onCopy} />
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-black/40 border border-white/5 rounded-2xl overflow-hidden animate-pulse">
      <div className="bg-white/[0.03] px-5 py-3.5 flex items-center gap-3 border-b border-white/5">
        <div className="w-7 h-7 rounded-lg bg-white/8" />
        <div className="flex-1">
          <div className="h-3.5 w-52 bg-white/8 rounded mb-1.5" />
          <div className="h-2.5 w-28 bg-white/5 rounded" />
        </div>
      </div>
      <div className="p-5 flex flex-col gap-3">
        {(['border-blue-500/20', 'border-emerald-500/20', 'border-amber-500/20', 'border-violet-500/20'] as const).map((c, j) => (
          <div key={j} className={`rounded-xl border-l-[3px] ${c} bg-white/[0.02] px-4 py-4`}>
            <div className="h-2.5 w-24 bg-white/8 rounded mb-3" />
            <div className="space-y-2">
              <div className="h-2.5 w-full bg-white/5 rounded" />
              <div className="h-2.5 w-4/5 bg-white/5 rounded" />
              <div className="h-2.5 w-3/5 bg-white/5 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Label ────────────────────────────────────────────────────────────────────

function FieldLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-xs text-gray-500 font-semibold tracking-wider uppercase mb-2">
      {children}
      {optional && (
        <span className="text-[10px] normal-case tracking-normal font-normal text-gray-600">(opcional)</span>
      )}
    </label>
  );
}

// ─── Main Generator ───────────────────────────────────────────────────────────

function DarkScriptGenerator() {
  const [title, setTitle] = useState('');
  const [niche, setNiche] = useState('');
  const [subniche, setSubniche] = useState('');
  const [channelContext, setChannelContext] = useState('');
  const [targetWords, setTargetWords] = useState(3000);
  const [isGenerating, setIsGenerating] = useState(false);
  const [script, setScript] = useState<TimeLapseScript | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<CopiedState>(null);

  const handleCopy = (text: string, sceneId: number, block: BlockType) => {
    navigator.clipboard.writeText(text);
    setCopied({ sceneId, block });
    setTimeout(() => setCopied(null), 2000);
  };

  const handleGenerate = async () => {
    if (!title.trim() || !niche.trim()) return;
    setIsGenerating(true);
    setScript(null);
    setError(null);
    try {
      const response = await fetch('/api/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          niche,
          subniche: subniche.trim() || undefined,
          context: channelContext.trim() || undefined,
          wordCount: targetWords,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(err.error || `Erro ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
      }

      const jsonMatch = accumulated.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : accumulated;
      const result: TimeLapseScript = JSON.parse(jsonStr);
      setScript(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar roteiro.');
    } finally {
      setIsGenerating(false);
    }
  };

  const skeletonCount = getScenesCount(targetWords);
  const selectedOption = WORD_OPTIONS.find(o => o.words === targetWords) ?? WORD_OPTIONS[6];

  return (
    <div className="min-h-screen bg-[#080b12] relative overflow-x-hidden text-gray-200">
      <div className="fixed top-0 left-1/4 w-96 h-96 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)', filter: 'blur(40px)' }} />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5" style={{ background: 'rgba(8,11,18,0.85)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-900 border border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
              <svg className="w-4 h-4 text-violet-300" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white">DarkScript</span>
              <span className="ml-2 text-[10px] font-mono text-violet-500/70 uppercase tracking-widest hidden sm:inline">Time Lapse Documentary</span>
            </div>
          </div>
          <Link href="/library" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-300 border border-white/10 transition-all hover:border-violet-500/40 hover:text-violet-300 hover:bg-violet-950/20">
            Voltar à Biblioteca
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">

        {/* ── Config Panel ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl p-6 mb-8 border border-white/10 bg-black/40 backdrop-blur-md">
          <div className="flex flex-col gap-6">

            {/* Título */}
            <div>
              <FieldLabel>Título do Vídeo</FieldLabel>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Why Your Tomatoes Fail in Hot Weather..."
                className="w-full bg-transparent border-b border-white/20 px-0 py-3 text-xl text-white font-medium focus:outline-none focus:border-violet-500 transition-colors placeholder-gray-600"
              />
            </div>

            {/* Nicho + Subnicho side by side on md+ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <FieldLabel>Nicho</FieldLabel>
                <input
                  type="text"
                  value={niche}
                  onChange={e => setNiche(e.target.value)}
                  placeholder="Ex: Cultivo tropical time lapse"
                  className="w-full bg-transparent border-b border-white/20 px-0 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-violet-500 transition-colors placeholder-gray-600"
                />
              </div>
              <div>
                <FieldLabel optional>Subnicho</FieldLabel>
                <input
                  type="text"
                  value={subniche}
                  onChange={e => setSubniche(e.target.value)}
                  placeholder="Ex: Cultivo de tomates em vasos pequenos"
                  className="w-full bg-transparent border-b border-white/20 px-0 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-violet-500 transition-colors placeholder-gray-600"
                />
              </div>
            </div>

            {/* Contexto do Canal */}
            <div>
              <FieldLabel optional>Contexto do Canal</FieldLabel>
              <textarea
                value={channelContext}
                onChange={e => setChannelContext(e.target.value)}
                rows={4}
                placeholder="Descreva sua persona, arquétipo do canal e perfil do público. Ex: Canal dark no estilo Attenborough, público 25-45 anos, interesse em autossuficiência e natureza, tom educativo e contemplativo."
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-violet-500/60 focus:bg-white/[0.05] transition-colors placeholder-gray-600 resize-y min-h-[100px]"
              />
            </div>

            {/* Tamanho + Gerar */}
            <div className="flex flex-col sm:flex-row items-end gap-4">
              <div className="w-full sm:w-auto">
                <FieldLabel>Tamanho do Roteiro</FieldLabel>
                <div className="relative">
                  <select
                    value={targetWords}
                    onChange={e => setTargetWords(Number(e.target.value))}
                    className="w-full sm:w-auto h-11 pl-4 pr-10 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-gray-300 focus:outline-none focus:border-violet-500/60 transition-colors cursor-pointer appearance-none"
                  >
                    {WORD_OPTIONS.map(opt => (
                      <option key={opt.words} value={opt.words} className="bg-[#0d1017] text-gray-200">
                        {opt.label} ({opt.sublabel})
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="hidden sm:flex items-end pb-0.5 text-[11px] text-gray-600 font-mono gap-1">
                <span>{getScenesCount(targetWords)} cenas</span>
                <span>·</span>
                <span>~{Math.round(targetWords / getScenesCount(targetWords))} palavras/cena</span>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!title.trim() || !niche.trim() || isGenerating}
                className="h-11 w-full sm:w-auto sm:ml-auto px-8 rounded-xl bg-violet-600 text-white text-sm font-bold transition-all hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[180px] shadow-[0_0_20px_rgba(139,92,246,0.15)] hover:shadow-[0_0_30px_rgba(139,92,246,0.35)]"
              >
                {isGenerating ? (
                  <>
                    <svg className="w-4 h-4 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Gerando Roteiro...
                  </>
                ) : (
                  'Gerar Roteiro'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Error ────────────────────────────────────────────────────────── */}
        {error && (
          <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-950/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* ── Skeleton ─────────────────────────────────────────────────────── */}
        {isGenerating && (
          <div className="space-y-4">
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* ── Script Output ────────────────────────────────────────────────── */}
        {script && !isGenerating && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Summary bar */}
            <div className="flex items-center justify-between px-1 pb-3 border-b border-white/8">
              <div>
                <h2 className="text-sm font-semibold text-gray-200 leading-tight">{script.titulo}</h2>
                <p className="text-[11px] text-gray-600 mt-0.5">
                  {script.nicho} · {script.duracao_total} · {script.cenas.length} cenas
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-3 text-[10px] font-mono text-gray-600">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500/60" />Narração</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500/60" />Vídeo</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500/60" />Imagem</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-violet-500/60" />Direção</span>
              </div>
            </div>

            {script.cenas.map((scene, index) => (
              <SceneCard
                key={scene.id}
                scene={scene}
                index={index}
                copied={copied}
                onCopy={handleCopy}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ScriptPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080b12]" />}>
      <DarkScriptGenerator />
    </Suspense>
  );
}
