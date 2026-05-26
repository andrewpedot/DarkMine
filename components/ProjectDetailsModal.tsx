'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  X, Trash2, Copy, Check, FileText, 
  ExternalLink, Sparkles, Video, Play, 
  ChevronRight, Calendar, User, Eye,
  BookOpen
} from 'lucide-react';
import type { Channel } from '../types/database';

interface Props {
  project: any;
  channels: Channel[];
  onClose: () => void;
  onSaved: (updatedProject: any) => void;
}

const STATUS_LABELS: Record<string, string> = {
  hook: 'Mineração',
  script: 'Títulos Prontos',
  produzido: 'Roteiros Finalizados',
  edicao: 'Edição de Vídeo',
  publicado: 'Publicado',
};

const STATUS_COLORS: Record<string, string> = {
  hook: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  script: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  produzido: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  edicao: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  publicado: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
};

export default function ProjectDetailsModal({ project, channels, onClose, onSaved }: Props) {
  const [titleOriginal, setTitleOriginal] = useState(project.title_original || '');
  const [titleFinal, setTitleFinal] = useState(project.title_final || '');
  const [market, setMarket] = useState(project.market || '🇧🇷 PT-BR');
  const [channelName, setChannelName] = useState(project.channel_name || '');
  const [status, setStatus] = useState(project.status || 'hook');
  
  // Script state
  const [script, setScript] = useState<any | null>(null);
  const [loadingScript, setLoadingScript] = useState(false);
  
  // Copy state
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedFinal, setCopiedFinal] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  
  // Save state
  const [isSaving, setIsSaving] = useState(false);

  // Fetch script corresponding to the project id or title
  useEffect(() => {
    const fetchScript = async () => {
      setLoadingScript(true);
      try {
        const titleParam = project.title_final || project.title_original || '';
        const response = await fetch(`/api/script/load?id=${project.id}&title=${encodeURIComponent(titleParam)}`);
        const data = await response.json();
        if (data.success && data.script) {
          setScript(data.script);
        } else {
          setScript(null);
        }
      } catch (err) {
        console.error('Erro ao carregar roteiro:', err);
        setScript(null);
      } finally {
        setLoadingScript(false);
      }
    };

    fetchScript();
    
    // Disable background scrolling
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [project.id]);

  const handleCopyText = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveMetadata = async () => {
    setIsSaving(true);
    try {
      const updates = {
        title_original: titleOriginal.trim(),
        title_final: titleFinal.trim() || null,
        market: market.trim(),
        channel_name: channelName || null,
        status: status,
      };
      
      onSaved({
        ...project,
        ...updates,
      });
      
    } catch (err) {
      console.error('Erro ao salvar:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Get formatted full narration
  const getFullNarration = () => {
    if (!script || !script.conteudo || !script.conteudo.cenas) return '';
    return script.conteudo.cenas
      .map((scene: any, idx: number) => `[BLOCO ${idx + 1} - ${scene.titulo_cena}]\n${scene.narracao}`)
      .join('\n\n');
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="fixed inset-x-4 top-[5%] bottom-[5%] md:inset-x-[8%] md:top-[8%] md:bottom-[8%] lg:inset-x-[12%] z-[101] bg-[#0c0f16] border border-white/10 rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0d1117] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-orange-600/10 border border-orange-500/20 text-orange-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Painel de Produção do Card
              </h2>
              <p className="text-xs text-gray-500">Acesse e edite títulos, roteiros e parâmetros deste card</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body Grid */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          
          {/* LEFT PANEL: Metadata Form */}
          <div className="lg:col-span-5 border-r border-white/10 p-6 overflow-y-auto space-y-5 h-full" style={{ scrollbarWidth: 'thin' }}>
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <Sparkles className="w-4 h-4 text-orange-400" />
              <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest">Configurações Gerais</h3>
            </div>

            {/* Título Original */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Título Original (Base)</label>
                <button 
                  onClick={() => handleCopyText(titleOriginal, setCopiedOriginal)}
                  className="text-gray-500 hover:text-white transition-colors"
                  title="Copiar título original"
                >
                  {copiedOriginal ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <input
                type="text"
                value={titleOriginal}
                onChange={e => setTitleOriginal(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/60 focus:bg-white/[0.05] transition-colors"
              />
            </div>

            {/* Título Adaptado / Final */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[11px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  Título Adaptado (Final)
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-normal lowercase">ganhador</span>
                </label>
                {titleFinal && (
                  <button 
                    onClick={() => handleCopyText(titleFinal, setCopiedFinal)}
                    className="text-gray-500 hover:text-white transition-colors"
                    title="Copiar título adaptado"
                  >
                    {copiedFinal ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
              <input
                type="text"
                value={titleFinal}
                onChange={e => setTitleFinal(e.target.value)}
                placeholder="Ex: Título em Português ou com melhor CTR"
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/60 focus:bg-white/[0.05] transition-colors"
              />
            </div>

            {/* Mercado e SKU */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] text-gray-400 font-bold uppercase tracking-wider block">Mercado / Idioma</label>
                <input
                  type="text"
                  value={market}
                  onChange={e => setMarket(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500/60 focus:bg-white/[0.05] transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-gray-400 font-bold uppercase tracking-wider block">Canal SKU</label>
                <select
                  value={channelName}
                  onChange={e => setChannelName(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500/60 transition-colors appearance-none cursor-pointer"
                >
                  <option value="" className="bg-[#0c0f16]">Sem canal SKU</option>
                  {channels.map(ch => (
                    <option key={ch.id} value={ch.name} className="bg-[#0c0f16]">
                      {ch.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status do Card */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-gray-400 font-bold uppercase tracking-wider block">Status da Produção</label>
              <div className="flex gap-3 items-center">
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/60 transition-colors cursor-pointer"
                >
                  {Object.entries(STATUS_LABELS).map(([k, label]) => (
                    <option key={k} value={k} className="bg-[#0c0f16]">
                      {label}
                    </option>
                  ))}
                </select>
                <span className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border flex-shrink-0 ${STATUS_COLORS[status] || 'border-white/10'}`}>
                  {STATUS_LABELS[status] || status}
                </span>
              </div>
            </div>

            {/* Reference PDF Info */}
            {project.reference_pdf && (() => {
              let displayFilename = 'PDF Anexo';
              try {
                if (project.reference_pdf.startsWith('{')) {
                  const parsed = JSON.parse(project.reference_pdf);
                  displayFilename = parsed.filename;
                } else {
                  displayFilename = project.reference_pdf;
                }
              } catch {}
              return (
                <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-gray-400">
                    <span>📎</span>
                    <span className="font-mono text-[11px] line-clamp-1">{displayFilename}</span>
                  </div>
                  <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-mono uppercase">PDF de Referência</span>
                </div>
              );
            })()}

            {/* Botão de Salvar Alterações */}
            <button
              onClick={handleSaveMetadata}
              disabled={isSaving}
              className="w-full h-11 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
            >
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </button>

            {/* Quick Actions / Jump Section */}
            <div className="border-t border-white/10 pt-5 space-y-3.5">
              <label className="text-[11px] text-gray-500 font-bold uppercase tracking-wider block">Ferramentas de Criação</label>
              
              <div className="grid grid-cols-3 gap-2">
                <Link
                  onClick={onClose}
                  href={`/hook?title=${encodeURIComponent(titleFinal || titleOriginal)}&id=${project.id}`}
                  className="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-emerald-950/10 hover:border-emerald-500/30 text-gray-400 hover:text-emerald-400 transition-all text-center flex flex-col items-center gap-1.5"
                >
                  <span className="text-lg">🎣</span>
                  <span className="text-[10px] font-bold">DarkHook</span>
                </Link>

                <Link
                  onClick={onClose}
                  href={`/script?title=${encodeURIComponent(titleFinal || titleOriginal)}&id=${project.id}`}
                  className="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-violet-950/10 hover:border-violet-500/30 text-gray-400 hover:text-violet-400 transition-all text-center flex flex-col items-center gap-1.5"
                >
                  <span className="text-lg">📝</span>
                  <span className="text-[10px] font-bold">DarkScript</span>
                </Link>

                <Link
                  onClick={onClose}
                  href={`/thumbnail?title=${encodeURIComponent(titleFinal || titleOriginal)}`}
                  className="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-amber-950/10 hover:border-amber-500/30 text-gray-400 hover:text-amber-400 transition-all text-center flex flex-col items-center gap-1.5"
                >
                  <span className="text-lg">🎨</span>
                  <span className="text-[10px] font-bold">DarkThumb</span>
                </Link>
              </div>

              <Link
                onClick={onClose}
                href="/media"
                className="w-full py-2.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-blue-950/10 hover:border-blue-500/30 text-gray-400 hover:text-blue-400 transition-all flex items-center justify-center gap-2 text-xs font-semibold"
              >
                <Video className="w-3.5 h-3.5" />
                Banco de Mídia (DarkMídia)
              </Link>
            </div>
          </div>

          {/* RIGHT PANEL: Script Output */}
          <div className="lg:col-span-7 bg-[#090c12] p-6 flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-white/5 flex-shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-violet-400" />
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest">Roteiro Correspondente</h3>
              </div>
              
              {script && (
                <button
                  onClick={() => handleCopyText(getFullNarration(), setCopiedScript)}
                  disabled={copiedScript}
                  className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                    copiedScript 
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                      : 'border-white/10 hover:border-white/20 text-gray-400 hover:text-white bg-white/5'
                  }`}
                >
                  {copiedScript ? <><Check className="w-3.5 h-3.5" /> Copiado!</> : <><Copy className="w-3.5 h-3.5" /> Copiar Roteiro</>}
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-5" style={{ scrollbarWidth: 'thin' }}>
              {loadingScript ? (
                <div className="h-full flex flex-col items-center justify-center py-20 gap-3 opacity-50">
                  <svg className="w-6 h-6 animate-spin text-violet-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-xs text-gray-400">Buscando roteiro...</span>
                </div>
              ) : script ? (
                <>
                  {/* Strategic & Neuromarketing Summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3 text-center space-y-0.5">
                      <span className="text-[9px] text-gray-500 uppercase font-mono block">Palavras</span>
                      <span className="text-sm font-black text-white">{script.wordcount || 'N/A'}</span>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3 text-center space-y-0.5" title={script.nicho}>
                      <span className="text-[9px] text-gray-500 uppercase font-mono block">Nicho</span>
                      <span className="text-xs font-bold text-violet-300 truncate block">{script.nicho || 'Geral'}</span>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3 text-center space-y-0.5" title={script.tom_de_voz}>
                      <span className="text-[9px] text-gray-500 uppercase font-mono block">Tom de Voz</span>
                      <span className="text-xs font-bold text-gray-300 truncate block">{script.tom_de_voz || 'Padrão'}</span>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3 text-center space-y-0.5" title={script.emocao_primaria}>
                      <span className="text-[9px] text-gray-500 uppercase font-mono block">Emoção</span>
                      <span className="text-xs font-bold text-orange-300 truncate block">{script.emocao_primaria || 'N/A'}</span>
                    </div>
                  </div>

                  {/* COMMON ENEMY & MIND LEVEL PANEL */}
                  {(script.inimigo_comum || script.nivel_consciencia) && (
                    <div className="p-4 rounded-xl border border-white/5 bg-[#141720]/40 space-y-2 text-xs">
                      {script.inimigo_comum && (
                        <div className="flex gap-2">
                          <span className="text-gray-500 font-bold uppercase tracking-wider text-[9px] min-w-[100px]">Inimigo Comum:</span>
                          <span className="text-gray-300">{script.inimigo_comum}</span>
                        </div>
                      )}
                      {script.nivel_consciencia && (
                        <div className="flex gap-2">
                          <span className="text-gray-500 font-bold uppercase tracking-wider text-[9px] min-w-[100px]">Nível Consciência:</span>
                          <span className="text-gray-300">Grau {script.nivel_consciencia}/5</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Strategic Analysis */}
                  {script.conteudo?.analise_estrategica && (
                    <div className="p-4 rounded-xl bg-violet-950/10 border border-violet-500/20 text-xs text-gray-300 leading-relaxed">
                      <span className="font-bold text-violet-400 block mb-1.5 text-[10px] uppercase tracking-wider">Análise Estratégica do Roteiro</span>
                      {script.conteudo.analise_estrategica}
                    </div>
                  )}

                  {/* Scenes Blocks */}
                  {script.conteudo?.cenas && Array.isArray(script.conteudo.cenas) && (
                    <div className="space-y-4">
                      <h4 className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Cenas & Narração</h4>
                      <div className="space-y-3">
                        {script.conteudo.cenas.map((scene: any, idx: number) => (
                          <div key={scene.id || idx} className="bg-black/30 border border-white/5 rounded-xl p-4 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md text-[10px] font-bold bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center flex-shrink-0">
                                {idx + 1}
                              </span>
                              <h5 className="text-xs font-black text-white">{scene.titulo_cena}</h5>
                            </div>
                            <p className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
                              {scene.narracao}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Text Fallback */}
                  {!script.conteudo?.cenas && script.conteudo_raw && (
                    <div className="bg-black/30 border border-white/5 rounded-xl p-4">
                      <pre className="text-xs text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{script.conteudo_raw}</pre>
                    </div>
                  )}
                  
                  {/* Action row at bottom of script */}
                  <div className="pt-2 flex justify-end">
                    <Link
                      onClick={onClose}
                      href={`/script?id=${project.id}`}
                      className="px-4 py-2 bg-violet-950/40 hover:bg-violet-900/60 border border-violet-500/30 hover:border-violet-500/60 text-violet-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      Editar Roteiro no DarkScript
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-center text-2xl">
                    📝
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Nenhum roteiro gerado</h4>
                    <p className="text-xs text-gray-500 max-w-xs mx-auto">
                      O roteiro deste card ainda não foi gerado pelo laboratório de copy DarkScript.
                    </p>
                  </div>
                  <Link
                    onClick={onClose}
                    href={`/script?title=${encodeURIComponent(titleFinal || titleOriginal)}&id=${project.id}`}
                    className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition-colors shadow-lg shadow-violet-500/20 inline-flex items-center gap-2"
                  >
                    <span>Gerar Roteiro no DarkScript</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </>
  );
}
