'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Channel } from '../../types/database';

type BlockType = 'narracao' | 'thumbnail';
type CopiedState = { sceneId: number; block: BlockType } | null;

interface SceneData {
  id: number;
  titulo_cena: string;
  narracao: string;
}

interface ScriptData {
  titulo: string;
  nicho: string;
  subnicho?: string;
  analise_estrategica?: string;
  thumbnail_prompt?: string;
  cenas: SceneData[];
}

const WORD_OPTIONS = [
  { words: 1500, label: '1500 palavras', sublabel: '~10 min' },
  { words: 1750, label: '1750 palavras', sublabel: '~11.7 min' },
  { words: 2000, label: '2000 palavras', sublabel: '~13.3 min' },
  { words: 2250, label: '2250 palavras', sublabel: '~15 min' },
  { words: 2500, label: '2500 palavras', sublabel: '~16.7 min' },
  { words: 2750, label: '2750 palavras', sublabel: '~18.3 min' },
  { words: 3000, label: '3000 palavras', sublabel: '~20 min' },
  { words: 3500, label: '3500 palavras', sublabel: '~23.3 min' },
  { words: 4000, label: '4000 palavras', sublabel: '~26.7 min' },
  { words: 4500, label: '4500 palavras', sublabel: '~30 min' },
  { words: 6000, label: '6000 palavras', sublabel: '~40 min' },
  { words: 7500, label: '7500 palavras', sublabel: '~50 min' },
  { words: 9000, label: '9000 palavras', sublabel: '~60 min' },
  { words: 10500, label: '10500 palavras', sublabel: '~70 min' },
  { words: 12000, label: '12000 palavras', sublabel: '~80 min' },
  { words: 13500, label: '13500 palavras', sublabel: '~90 min' },
] as const;

const BLOCK_CONFIG = {
  narracao: {
    label: 'Narração',
    sublabel: 'Texto de copywriting',
    borderClass: 'border-l-[3px] border-blue-500/70',
    bgClass: 'bg-blue-500/[0.04]',
    badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    textClass: 'text-blue-400',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
  }
};

function SceneBlock({
  type,
  text,
  sceneId,
  copied,
  onCopy,
}: {
  type: 'narracao';
  text: string;
  sceneId: number;
  copied: CopiedState;
  onCopy: (text: string, sceneId: number, block: BlockType) => void;
}) {
  const cfg = BLOCK_CONFIG[type];
  const isCopied = copied?.sceneId === sceneId && copied?.block === type;

  if (!text) return null;

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
          {isCopied ? 'Copiado!' : 'Copiar'}
        </button>
      </div>
      <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
        {text}
      </p>
    </div>
  );
}

function SceneCard({
  scene,
  index,
  copied,
  onCopy,
}: {
  scene: SceneData;
  index: number;
  copied: CopiedState;
  onCopy: (text: string, sceneId: number, block: BlockType) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-black/40 border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-colors">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full bg-gradient-to-r from-white/[0.03] to-white/[0.01] px-5 py-4 flex items-center justify-between border-b border-white/5 hover:from-white/[0.05] hover:to-white/[0.02] transition-all"
      >
        <div className="flex items-center gap-4">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-black bg-gradient-to-br from-violet-600/30 to-violet-800/30 border border-violet-500/30 text-violet-300 flex-shrink-0 shadow-[0_0_15px_rgba(139,92,246,0.15)]">
            {index + 1}
          </span>
          <div className="text-left">
            <h3 className="text-base font-bold text-white leading-tight">{scene.titulo_cena}</h3>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="p-5 flex flex-col gap-3">
          <SceneBlock
            type="narracao"
            text={scene.narracao}
            sceneId={scene.id}
            copied={copied}
            onCopy={onCopy}
          />
        </div>
      )}
    </div>
  );
}

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

function DarkScriptGenerator() {
  const router = useRouter();
  
  // Base details & auto-deductive copywriting parameters
  const [title, setTitle] = useState('');
  const [niche, setNiche] = useState('');
  const [subniche, setSubniche] = useState('');
  const [channelContext, setChannelContext] = useState('');
  const [publicoAlvo, setPublicoAlvo] = useState('');
  const [idiomaNarracao, setIdiomaNarracao] = useState('Português');
  const [culturaAlvo, setCulturaAlvo] = useState('Brasil');
  const [quantidadeTotalPalavras, setQuantidadeTotalPalavras] = useState(3000);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [script, setScript] = useState<ScriptData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<CopiedState>(null);
  const [streamingText, setStreamingText] = useState('');
  const [generationStage, setGenerationStage] = useState<'idle' | 'generating' | 'parsing' | 'done'>('idle');
  const [isSaving, setIsSaving] = useState(false);
  const [fullNarration, setFullNarration] = useState('');
  const [flowToast, setFlowToast] = useState<string | null>(null);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [savedScripts, setSavedScripts] = useState<any[]>([]);
  const [isLoadingScripts, setIsLoadingScripts] = useState(false);
  const [rawScript, setRawScript] = useState<string>('');

  useEffect(() => {
    fetch('/api/channels')
      .then(r => r.json())
      .then(j => setChannels((j.channels || []).filter((c: Channel) => c.status === 'ativo')))
      .catch(() => {});
  }, []);

  const handleChannelSelect = (channelId: string) => {
    setSelectedChannelId(channelId);
    if (!channelId) { setSelectedChannel(null); return; }
    const ch = channels.find(c => c.id === channelId) ?? null;
    setSelectedChannel(ch);
    if (ch) {
      setNiche(ch.niche);
      setSubniche(ch.sub_niche ?? '');
      setChannelContext(ch.persona ?? '');
    }
  };

  const handleCopy = (text: string, sceneId: number, block: BlockType) => {
    navigator.clipboard.writeText(text);
    setCopied({ sceneId, block });
    setTimeout(() => setCopied(null), 2000);
  };

  const copyAllNarration = () => {
    if (fullNarration) {
      navigator.clipboard.writeText(fullNarration);
      setCopied({ sceneId: 0, block: 'narracao' });
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const saveToLibrary = async () => {
    if (!script) return;
    setIsSaving(true);
    try {
      const response = await fetch('/api/script/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: script.titulo,
          nicho: script.nicho,
          subnicho: subniche,
          contexto: channelContext,
          wordcount: quantidadeTotalPalavras,
          conteudo: script,
          conteudo_raw: rawScript,
          // metadata fields
          publico_alvo: publicoAlvo,
          idioma_narracao: idiomaNarracao,
          cultura_alvo: culturaAlvo,
        }),
      });
      const data = await response.json();
      console.log('Salvar resultado:', data);
      if (response.ok) {
        setFlowToast('✓ Roteiro salvo na biblioteca!');
        setTimeout(() => setFlowToast(null), 3000);
      } else {
        throw new Error(data.error || 'Erro ao salvar');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar na biblioteca.');
    } finally {
      setIsSaving(false);
    }
  };

  const loadFromLibrary = async () => {
    setShowLoadModal(true);
    setIsLoadingScripts(true);
    try {
      const response = await fetch('/api/script/load?limit=10');
      const data = await response.json();
      console.log('Scripts carregados:', data);
      if (data.scripts) {
        setSavedScripts(data.scripts);
      }
    } catch (err) {
      console.error('Erro ao carregar scripts:', err);
      setFlowToast('Erro ao carregar roteiros salvos.');
    } finally {
      setIsLoadingScripts(false);
    }
  };

  const selectScript = (savedScript: any) => {
    console.log('Selecionando script:', savedScript);
    if (savedScript.conteudo) {
      setScript(savedScript.conteudo);
      setTitle(savedScript.conteudo.titulo || savedScript.titulo || '');
      setNiche(savedScript.conteudo.nicho || savedScript.nicho || '');
      setSubniche(savedScript.conteudo.subnicho || savedScript.subnicho || '');
      setChannelContext(savedScript.conteudo.contexto || savedScript.contexto || '');
      setQuantidadeTotalPalavras(savedScript.wordcount || 3000);
      
      const content = savedScript.conteudo;
      setPublicoAlvo(content.publico_alvo || savedScript.publico_alvo || '');
      setIdiomaNarracao(content.idioma_narracao || savedScript.idioma_narracao || 'Português');
      setCulturaAlvo(content.cultura_alvo || savedScript.cultura_alvo || 'Brasil');
      
      setGenerationStage('done');

      if (savedScript.conteudo.cenas) {
        const narrationText = savedScript.conteudo.cenas
          .map((s: any, i: number) => `[BLOCO ${i + 1}]\n${s.narracao}`)
          .join('\n\n');
        setFullNarration(narrationText);
      }
    }
    setShowLoadModal(false);
  };

  const handleGenerate = async () => {
    if (!title.trim() || !niche.trim()) return;
    setIsGenerating(true);
    setScript(null);
    setError(null);
    setStreamingText('');
    setGenerationStage('generating');

    try {
      const response = await fetch('/api/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          niche,
          subniche: subniche.trim() || undefined,
          context: channelContext.trim() || undefined,
          publico_alvo: publicoAlvo.trim() || undefined,
          idioma_narracao: idiomaNarracao || 'Português',
          cultura_alvo: culturaAlvo.trim() || undefined,
          wordCount: Number(quantidadeTotalPalavras),
          ref_transcripts: selectedChannel?.ref_transcripts?.length ? selectedChannel.ref_transcripts : undefined,
          ref_titles: selectedChannel?.ref_titles?.length ? selectedChannel.ref_titles : undefined,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Erro ${response.status}: ${text}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.replace(/^data: */, '');
          if (!jsonStr) continue;
          try {
            const event = JSON.parse(jsonStr);

            if (event.type === 'progress') {
              setStreamingText(prev => prev + event.text);
            } else if (event.type === 'parsing') {
              setGenerationStage('parsing');
            } else if (event.type === 'done') {
              const result: ScriptData = event.data;
              if (!result.cenas || !Array.isArray(result.cenas)) {
                throw new Error('Roteiro gerado em formato inválido.');
              }
              const narrationText = result.cenas
                .map((s, i) => `[BLOCO ${i + 1}]\n${s.narracao}`)
                .join('\n\n');
              setFullNarration(narrationText);
              setScript(result);
              setRawScript(streamingText);
              setGenerationStage('done');
            } else if (event.type === 'error') {
              throw new Error(event.message);
            }
          } catch (parseErr) {
            console.error('Parse error:', parseErr);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar roteiro.');
      setGenerationStage('idle');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080b12] relative overflow-x-hidden text-gray-200">
      <div className="fixed top-0 left-1/4 w-96 h-96 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)', filter: 'blur(40px)' }} />

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
              <span className="ml-2 text-[10px] font-mono text-violet-500/70 uppercase tracking-widest hidden sm:inline">Auto-Deductive Copy</span>
            </div>
          </div>
          <Link href="/library" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-300 border border-white/10 transition-all hover:border-violet-500/40 hover:text-violet-300 hover:bg-violet-950/20">
            Voltar à Biblioteca
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">

        <div className="rounded-2xl p-6 mb-8 border border-white/10 bg-black/40 backdrop-blur-md">
          <div className="flex flex-col gap-6">

            {/* Canal */}
            {channels.length > 0 && (
              <div>
                <FieldLabel optional>Canal</FieldLabel>
                <div className="relative">
                  <select
                    value={selectedChannelId}
                    onChange={e => handleChannelSelect(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-violet-500/60 transition-colors appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-[#0d1017]">Selecionar canal (opcional)</option>
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
                  <div className="mt-3 rounded-xl bg-violet-900/10 border border-violet-500/20 px-4 py-3 text-xs text-gray-400 space-y-1">
                    {selectedChannel.persona && (
                      <p className="line-clamp-2 text-gray-300">{selectedChannel.persona}</p>
                    )}
                    <div className="flex items-center gap-3 text-gray-600 font-mono mt-1">
                      {(selectedChannel.ref_transcripts?.length ?? 0) > 0 && (
                        <span>{selectedChannel.ref_transcripts!.length} transcrições ref.</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <FieldLabel>Título do Vídeo</FieldLabel>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Como o Algoritmo do YouTube Pune Pequenos Canais..."
                className="w-full bg-transparent border-b border-white/20 px-0 py-3 text-xl text-white font-medium focus:outline-none focus:border-violet-500 transition-colors placeholder-gray-600"
              />
            </div>

            <div>
              <FieldLabel optional>Contexto do Canal / Persona</FieldLabel>
              <textarea
                value={channelContext}
                onChange={e => setChannelContext(e.target.value)}
                rows={3}
                placeholder="Descreva a persona, tom de voz ou comportamento geral do seu canal."
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-violet-500/60 focus:bg-white/[0.05] transition-colors placeholder-gray-600 resize-y min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <FieldLabel>Nicho</FieldLabel>
                <input
                  type="text"
                  value={niche}
                  onChange={e => setNiche(e.target.value)}
                  placeholder="Ex: YouTube Marketing"
                  className="w-full bg-transparent border-b border-white/20 px-0 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-violet-500 transition-colors placeholder-gray-600"
                />
              </div>
              <div>
                <FieldLabel optional>Subnicho</FieldLabel>
                <input
                  type="text"
                  value={subniche}
                  onChange={e => setSubniche(e.target.value)}
                  placeholder="Ex: Crescimento de canais dark"
                  className="w-full bg-transparent border-b border-white/20 px-0 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-violet-500 transition-colors placeholder-gray-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <FieldLabel>Público-Alvo</FieldLabel>
                <input
                  type="text"
                  value={publicoAlvo}
                  onChange={e => setPublicoAlvo(e.target.value)}
                  placeholder="Ex: Criadores de conteúdo iniciantes"
                  className="w-full bg-transparent border-b border-white/20 px-0 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-violet-500 transition-colors placeholder-gray-600"
                />
              </div>
              <div>
                <FieldLabel>Idioma da Narração</FieldLabel>
                <input
                  type="text"
                  value={idiomaNarracao}
                  onChange={e => setIdiomaNarracao(e.target.value)}
                  placeholder="Ex: Português, Inglês (UK)"
                  className="w-full bg-transparent border-b border-white/20 px-0 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-violet-500 transition-colors placeholder-gray-600"
                />
              </div>
              <div>
                <FieldLabel>Cultura / País Alvo</FieldLabel>
                <input
                  type="text"
                  value={culturaAlvo}
                  onChange={e => setCulturaAlvo(e.target.value)}
                  placeholder="Ex: Brasil"
                  className="w-full bg-transparent border-b border-white/20 px-0 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-violet-500 transition-colors placeholder-gray-600"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-end justify-between gap-4">
              <div className="w-full sm:w-auto">
                <FieldLabel>Tamanho do Roteiro</FieldLabel>
                <div className="relative">
                  <select
                    value={quantidadeTotalPalavras}
                    onChange={e => setQuantidadeTotalPalavras(Number(e.target.value))}
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

              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  onClick={loadFromLibrary}
                  className="h-11 px-4 rounded-xl bg-white/5 text-gray-400 text-sm font-medium border border-white/10 transition-all hover:bg-white/10 hover:text-white hover:border-white/20 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  Carregar
                </button>

                <button
                  onClick={handleGenerate}
                  disabled={!title.trim() || !niche.trim() || isGenerating}
                  className="h-11 w-full sm:w-auto px-8 rounded-xl bg-violet-600 text-white text-sm font-bold transition-all hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.15)] hover:shadow-[0_0_30px_rgba(139,92,246,0.35)]"
                >
                  {isGenerating ? (
                    <>
                      <svg className="w-4 h-4 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Gerando...
                    </>
                  ) : (
                    'Gerar Roteiro'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-950/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {isGenerating && (
          <div className="rounded-2xl border border-white/10 bg-black/40 overflow-hidden">
            <div className="bg-white/[0.03] px-5 py-3.5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-500"></span>
                  </span>
                  <span className="text-sm font-medium text-white">
                    {generationStage === 'parsing' ? 'Processando...' : 'Gerando roteiro...'}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-gray-500">
                ~{streamingText.length} chars
              </span>
            </div>
            <div className="p-5">
              <div className="font-mono text-xs text-gray-400 whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed">
                {streamingText || 'Aguardando resposta...'}
                <span className="inline-block w-2 h-3.5 bg-violet-400 ml-1 animate-pulse align-middle"></span>
              </div>
            </div>
          </div>
        )}

        {script && !isGenerating && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-violet-950/30 to-transparent p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">{script.titulo}</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    {script.nicho} · {script.cenas.length} blocos · ~{quantidadeTotalPalavras} palavras
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={copyAllNarration}
                    disabled={!fullNarration}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/50 disabled:opacity-40"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Copiar Narração
                  </button>
                  <button
                    onClick={saveToLibrary}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 disabled:opacity-40"
                  >
                    {isSaving ? (
                      <>
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                        Salvar na Biblioteca
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Strategic Analysis Card */}
            {script.analise_estrategica && (
              <div className="bg-violet-950/20 border border-violet-500/20 rounded-2xl p-6">
                <h3 className="text-base font-bold text-violet-300 flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Análise Estratégica
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {script.analise_estrategica}
                </p>
              </div>
            )}

            {/* Script Blocks */}
            {script.cenas.map((scene, index) => (
              <SceneCard
                key={scene.id}
                scene={scene}
                index={index}
                copied={copied}
                onCopy={handleCopy}
              />
            ))}

            {/* Thumbnail Prompt Card */}
            {script.thumbnail_prompt && (
              <div className="bg-orange-950/20 border border-orange-500/20 rounded-2xl p-6">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <h3 className="text-base font-bold text-orange-300 flex items-center gap-2">
                    <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Prompt de Thumbnail
                  </h3>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(script.thumbnail_prompt!);
                      setCopied({ sceneId: 9999, block: 'thumbnail' });
                      setTimeout(() => setCopied(null), 2000);
                    }}
                    className={`flex-shrink-0 text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                      copied?.sceneId === 9999
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                        : 'border-white/10 bg-white/5 text-gray-400 hover:text-white hover:border-white/20 hover:bg-white/10'
                    }`}
                  >
                    {copied?.sceneId === 9999 ? 'Copiado!' : 'Copiar Prompt'}
                  </button>
                </div>
                <p className="text-sm text-gray-300 font-mono bg-black/30 p-4 rounded-xl border border-white/5 leading-relaxed whitespace-pre-wrap">
                  {script.thumbnail_prompt}
                </p>
              </div>
            )}

            <div className="text-center py-4 border-t border-white/5">
              <p className="text-xs text-gray-600">
                Roteiro gerado · {script.cenas.length} blocos · ~{quantidadeTotalPalavras} palavras no total
              </p>
            </div>
          </div>
        )}

        {flowToast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl bg-black/90 border border-white/20 text-sm font-medium text-white shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            {flowToast}
          </div>
        )}

        {showLoadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <h3 className="text-lg font-bold text-white">Roteiros Salvos</h3>
                <button
                  onClick={() => setShowLoadModal(false)}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {isLoadingScripts ? (
                  <div className="flex items-center justify-center py-8">
                    <svg className="w-6 h-6 animate-spin text-violet-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                ) : savedScripts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum roteiro salvo ainda.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {savedScripts.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => selectScript(s)}
                        className="w-full text-left p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-white truncate">{s.titulo}</h4>
                            <p className="text-xs text-gray-500 mt-1">
                              {s.nicho || 'Sem nicho'} · {s.subnicho || ''}
                            </p>
                            <p className="text-[10px] text-gray-600 mt-1">
                              {s.wordcount} palavras · {new Date(s.criado_em).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <svg className="w-4 h-4 text-gray-500 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7-7" />
                          </svg>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ScriptPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080b12]" />}>
      <DarkScriptGenerator />
    </Suspense>
  );
}
