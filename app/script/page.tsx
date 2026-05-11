'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Channel } from '../../types/database';

type BlockType = 'narracao' | 'video' | 'imagem' | 'direcao' | 'thumbnail';
type CopiedState = { sceneId: number; block: BlockType } | null;
type FilterType = 'all' | BlockType;

interface SceneData {
  id: number;
  titulo_cena: string;
  tempo_inicio: string;
  tempo_fim: string;
  narracao: string;
  video?: string;
  imagem?: string;
  direcao: string;
  thumbnail?: string;
  prompt_video?: string;
  prompt_imagem?: string;
}

interface ScriptData {
  titulo: string;
  nicho: string;
  duracao_total: string;
  idioma?: string;
  total_words?: number;
  cenas: SceneData[];
}

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
  filterLabel: string;
  icon: React.ReactNode;
}> = {
  narracao: {
    label: 'Narração',
    sublabel: 'Voz — Estilo Attenborough',
    borderClass: 'border-l-[3px] border-blue-500/70',
    bgClass: 'bg-blue-500/[0.04]',
    badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    textClass: 'text-blue-400',
    filterLabel: 'Narração',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
  },
  video: {
    label: 'Prompt de Vídeo',
    sublabel: 'VEO3 / Kling AI',
    borderClass: 'border-l-[3px] border-emerald-500/70',
    bgClass: 'bg-emerald-500/[0.04]',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    textClass: 'text-emerald-400',
    filterLabel: 'Vídeo',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
  imagem: {
    label: 'Prompt de Imagem',
    sublabel: 'Nano Banana',
    borderClass: 'border-l-[3px] border-amber-500/70',
    bgClass: 'bg-amber-500/[0.04]',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    textClass: 'text-amber-400',
    filterLabel: 'Imagem',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  thumbnail: {
    label: 'Thumbnail',
    sublabel: 'YouTube — Nano Banana',
    borderClass: 'border-l-[3px] border-orange-500/70',
    bgClass: 'bg-orange-500/[0.04]',
    badgeClass: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
    textClass: 'text-orange-400',
    filterLabel: 'Thumbnail',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
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
    filterLabel: 'Direção',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
};

const BLOCK_ORDER: BlockType[] = ['narracao', 'video', 'imagem', 'thumbnail', 'direcao'];

function getScenesCount(targetWords: number): number {
  if (targetWords <= 2000) return 4;
  if (targetWords <= 3000) return 6;
  if (targetWords <= 3750) return 8;
  return 9;
}

function SceneBlock({
  type,
  text,
  sceneId,
  copied,
  onCopy,
  clipLabel,
}: {
  type: BlockType;
  text: string;
  sceneId: number;
  copied: CopiedState;
  onCopy: (text: string, sceneId: number, block: BlockType) => void;
  clipLabel?: string;
}) {
  const cfg = BLOCK_CONFIG[type];
  const isCopied = copied?.sceneId === sceneId && copied?.block === type;
  const isMono = type === 'video' || type === 'imagem' || type === 'thumbnail';

  if (!text) return null;

  return (
    <div className={`rounded-xl ${cfg.borderClass} ${cfg.bgClass} px-4 py-4`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cfg.textClass}>{cfg.icon}</span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${cfg.badgeClass}`}>
            {clipLabel || cfg.label}
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

function SceneCard({
  scene,
  index,
  copied,
  onCopy,
  visibleBlocks,
}: {
  scene: SceneData;
  index: number;
  copied: CopiedState;
  onCopy: (text: string, sceneId: number, block: BlockType) => void;
  visibleBlocks: FilterType;
}) {
  const [expanded, setExpanded] = useState(true);

  const getVideoText = () => scene.video || scene.prompt_video || '';
  const getImagemText = () => scene.imagem || scene.prompt_imagem || '';

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
            <span className="text-xs font-mono text-gray-500">
              {scene.tempo_inicio} — {scene.tempo_fim}
            </span>
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
          {(visibleBlocks === 'all' ? BLOCK_ORDER : [visibleBlocks as BlockType]).map(blockType => {
            if (blockType === 'video') {
              const videoText = getVideoText();
              const clipPattern = /\[CLIP \d+\/\d+\]/gi;
              const clips = videoText.split(/(?=\[CLIP )/i).filter(c => c.trim());
              if (clips.length > 0 && clips[0].match(clipPattern)) {
                return clips.map((clip, clipIdx) => {
                  const clipMatch = clip.match(/\[CLIP (\d+)\/(\d+)\]/i);
                  const clipNum = clipMatch ? clipMatch[1] : clipIdx + 1;
                  const clipTotal = clipMatch ? clipMatch[2] : clips.length;
                  const clipText = clip.replace(/\[CLIP \d+\/\d+\]/i, '').trim();
                  return (
                    <SceneBlock
                      key={`video-clip-${clipIdx}`}
                      type={blockType}
                      text={clipText}
                      clipLabel={`CLIP ${clipNum}/${clipTotal}`}
                      sceneId={scene.id}
                      copied={copied}
                      onCopy={onCopy}
                    />
                  );
                });
              }
              return (
                <SceneBlock
                  key={blockType}
                  type={blockType}
                  text={videoText}
                  sceneId={scene.id}
                  copied={copied}
                  onCopy={onCopy}
                />
              );
            }
            let text = '';
            if (blockType === 'narracao') text = scene.narracao;
            if (blockType === 'imagem') text = getImagemText();
            if (blockType === 'direcao') text = scene.direcao;
            if (blockType === 'thumbnail') text = scene.thumbnail || '';
            return (
              <SceneBlock
                key={blockType}
                type={blockType}
                text={text}
                sceneId={scene.id}
                copied={copied}
                onCopy={onCopy}
              />
            );
          })}
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
  const [title, setTitle] = useState('');
  const [niche, setNiche] = useState('');
  const [subniche, setSubniche] = useState('');
  const [channelContext, setChannelContext] = useState('');
  const [targetWords, setTargetWords] = useState(3000);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [script, setScript] = useState<ScriptData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<CopiedState>(null);
  const [streamingText, setStreamingText] = useState('');
  const [generationStage, setGenerationStage] = useState<'idle' | 'generating' | 'parsing' | 'done'>('idle');
  const [filter, setFilter] = useState<FilterType>('all');
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
          wordcount: targetWords,
          conteudo: script,
          conteudo_raw: rawScript,
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
      setTargetWords(savedScript.wordcount || 3000);
      setFilter('all');
      setGenerationStage('done');

      if (savedScript.conteudo.cenas) {
        const narrationText = savedScript.conteudo.cenas
          .map((s: any, i: number) => `[CENA ${i + 1}]\n${s.narracao}`)
          .join('\n\n');
        setFullNarration(narrationText);
      }
    }
    setShowLoadModal(false);
  };

  const handleSendToFlow = () => {
    console.log('scriptData:', script, 'rawScript:', streamingText?.substring(0, 200));

    const scriptData = script;
    let videoPrompts: string[] = [];

    if (scriptData && scriptData.cenas) {
      videoPrompts = scriptData.cenas.flatMap((cena: any) =>
        (cena.blocos || cena.blocks || [])
          .filter((b: any) =>
            b.tipo === 'video' || b.type === 'video' ||
            (b.label || '').toLowerCase().includes('vídeo') ||
            (b.label || '').toLowerCase().includes('video')
          )
          .map((b: any) => b.conteudo || b.content || b.text || '')
          .filter(Boolean)
      );
    } else if (scriptData && Array.isArray(scriptData)) {
      videoPrompts = scriptData.flatMap((cena: any) =>
        (cena.blocos || cena.blocks || [])
          .filter((b: any) => b.tipo === 'video' || b.type === 'video')
          .map((b: any) => b.conteudo || b.content || b.text || '')
          .filter(Boolean)
      );
    }

    if (videoPrompts.length === 0 && scriptData?.cenas) {
      for (const cena of scriptData.cenas) {
        const videoText = cena.video || cena.prompt_video || '';
        if (!videoText.trim()) continue;

        const clipPattern = /\[CLIP \d+\/\d+\]/gi;
        const clips = videoText.split(/(?=\[CLIP )/i).filter(c => c.trim());

        for (const clip of clips) {
          if (clip.match(clipPattern)) {
            const clipText = clip.replace(/\[CLIP \d+\/\d+\]/i, '').trim();
            if (clipText) {
              videoPrompts.push(clipText);
            }
          } else if (videoText && !videoText.includes('[CLIP')) {
            videoPrompts.push(videoText.trim());
            break;
          }
        }
      }
    }

    if (videoPrompts.length === 0 && streamingText) {
      const clipRegex = /\[CLIP\s+\d+\/\d+\][^\[]+/g;
      const matches = streamingText.match(clipRegex) || [];
      videoPrompts = matches.map((m: string) => m.replace(/^\[CLIP\s+\d+\/\d+\]\s*/, '').trim());
    }

    console.log('Video prompts encontrados:', videoPrompts.length);

    if (videoPrompts.length === 0) {
      setFlowToast('Nenhum prompt de vídeo encontrado. Verifique se o roteiro foi gerado corretamente.');
      setTimeout(() => setFlowToast(null), 4000);
      return;
    }

    const handleConfirmation = (e: MessageEvent) => {
      if (e.data?.type === 'DARKMINE_FLOW_CONFIRMED') {
        setFlowToast(`✓ ${videoPrompts.length} clips prontos na extensão — abra o ícone ⚡`);
        setTimeout(() => setFlowToast(null), 5000);
      }
      window.removeEventListener('message', handleConfirmation);
    };
    window.addEventListener('message', handleConfirmation);

    window.postMessage({
      type: 'DARKMINE_FLOW_QUEUE',
      prompts: videoPrompts,
      videoTitle: title,
      delay: 90,
    }, '*');
  };

  const handleGenerate = async () => {
    if (!title.trim() || !niche.trim()) return;
    setIsGenerating(true);
    setScript(null);
    setError(null);
    setStreamingText('');
    setGenerationStage('generating');
    setFilter('all');

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
                .map((s, i) => `[CENA ${i + 1}]\n${s.narracao}`)
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

  const totalWords = script?.cenas.reduce((acc, s) => acc + (s.narracao?.split(/\s+/).length || 0), 0) || 0;
  const totalClips = script?.cenas.reduce((acc, s) => {
    const videoText = s.video || s.prompt_video || '';
    const clipMatches = (videoText.match(/\[CLIP \d+\/\d+\]/gi) || []).length;
    return acc + (clipMatches > 0 ? clipMatches : 1);
  }, 0) || 0;

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
              <span className="ml-2 text-[10px] font-mono text-violet-500/70 uppercase tracking-widest hidden sm:inline">Time Lapse Documentary</span>
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
                      {(selectedChannel.characters?.length ?? 0) > 0 && (
                        <span className="flex items-center gap-1">
                          {selectedChannel.characters!.slice(0, 3).map(c =>
                            c.image_url
                              ? <img key={c.id} src={c.image_url} alt={c.name} className="w-5 h-5 rounded-full object-cover border border-white/10" />
                              : <div key={c.id} className="w-5 h-5 rounded-full bg-violet-900/50 border border-violet-500/20 flex items-center justify-center text-[9px] text-violet-300">{c.name[0]}</div>
                          )}
                        </span>
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
                placeholder="Ex: Why Your Tomatoes Fail in Hot Weather..."
                className="w-full bg-transparent border-b border-white/20 px-0 py-3 text-xl text-white font-medium focus:outline-none focus:border-violet-500 transition-colors placeholder-gray-600"
              />
            </div>

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
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">{script.titulo}</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    {script.nicho} · ~{Math.round((script.total_words || 3000) / 150)} min
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
                  <button
                    onClick={handleSendToFlow}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/50"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Enviar para Flow
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                    filter === 'all'
                      ? 'bg-white/10 border-white/30 text-white'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  Tudo
                </button>
                {BLOCK_ORDER.map(bt => (
                  <button
                    key={bt}
                    onClick={() => setFilter(bt)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                      filter === bt
                        ? `${BLOCK_CONFIG[bt].badgeClass.replace('/15 ', '/20 ').replace('text-', 'text-').replace('border-', 'border-')} border-current`
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    {BLOCK_CONFIG[bt].filterLabel}
                  </button>
                ))}
              </div>
            </div>

            {script.cenas.map((scene, index) => (
              <SceneCard
                key={scene.id}
                scene={scene}
                index={index}
                copied={copied}
                onCopy={handleCopy}
                visibleBlocks={filter}
              />
            ))}

            <div className="text-center py-4 border-t border-white/5">
              <p className="text-xs text-gray-600">
                Roteiro gerado · {totalClips} clips de 8s · {script.cenas.length} cenas · ~{Math.round((script.total_words || 3000) / 150)} min de footage · Idioma: {script.idioma || 'Português'}
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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
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
