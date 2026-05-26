'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Trash2, Eye } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { supabase } from '../../lib/supabase';
import ChannelDrawer from '../../components/ChannelDrawer';
import ProjectDetailsModal from '../../components/ProjectDetailsModal';
import type { Channel, ChannelStatus } from '../../types/database';

interface ProjectWithMarkets extends Record<string, any> {
  analyzedMarkets?: Array<{ langCode: string; status: string }>;
}

type LibTab = 'producao' | 'canais';
type ChannelView = 'kanban' | 'tabela';

const CHANNEL_COLS: { id: ChannelStatus; title: string; color: string }[] = [
  { id: 'ativo', title: 'Ativo', color: 'border-emerald-500/30' },
  { id: 'pausado', title: 'Pausado', color: 'border-amber-500/30' },
  { id: 'arquivado', title: 'Arquivado', color: 'border-gray-500/30' },
];

const LANG_LABEL: Record<string, string> = { pt: 'PT', en: 'EN', es: 'ES' };
const LANG_COLOR: Record<string, string> = {
  pt: 'border-cyan-500/30 text-cyan-400 bg-cyan-900/20',
  en: 'border-blue-500/30 text-blue-400 bg-blue-900/20',
  es: 'border-orange-500/30 text-orange-400 bg-orange-900/20',
};
const STATUS_COLOR: Record<ChannelStatus, string> = {
  ativo: 'text-emerald-400 bg-emerald-900/20 border-emerald-500/30',
  pausado: 'text-amber-400 bg-amber-900/20 border-amber-500/30',
  arquivado: 'text-gray-400 bg-gray-800/40 border-gray-600/30',
};

export default function LibraryPage() {
  const [tab, setTab] = useState<LibTab>('producao');

  // Projects state
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);

  const handleProjectSaved = async (updatedProject: any) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    setSelectedProject(updatedProject);
    try {
      const updates = {
        title_original: updatedProject.title_original,
        title_final: updatedProject.title_final,
        market: updatedProject.market,
        channel_name: updatedProject.channel_name,
        status: updatedProject.status,
      };
      if (supabase) {
        const { error } = await supabase.from('projects').update(updates).eq('id', updatedProject.id);
        if (error) throw error;
      } else {
        const lib = JSON.parse(localStorage.getItem('darkmine_library') || '[]');
        const idx = lib.findIndex((p: any) => p.id === updatedProject.id);
        if (idx !== -1) {
          lib[idx] = { ...lib[idx], ...updates, updated_at: new Date().toISOString() };
          localStorage.setItem('darkmine_library', JSON.stringify(lib));
        }
      }
    } catch (e) {
      console.error('Erro ao atualizar projeto no banco:', e);
    }
  };

  // Channels state
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [channelView, setChannelView] = useState<ChannelView>('kanban');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [filterStatus, setFilterStatus] = useState<ChannelStatus | 'all'>('all');
  const [filterNiche, setFilterNiche] = useState('');
  const [filterLang, setFilterLang] = useState('');
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);
  const [isDeletingChannel, setIsDeletingChannel] = useState(false);

  // New Card Modal states
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectMarket, setNewProjectMarket] = useState('🇧🇷 PT-BR');
  const [newProjectChannelName, setNewProjectChannelName] = useState('');
  const [newProjectStatus, setNewProjectStatus] = useState<string>('hook');
  const [newProjectPdfFile, setNewProjectPdfFile] = useState<File | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // ── Projects & Channels Fetch ───────────────────────────────────────────
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        if (!supabase) throw new Error('Supabase não configurado');
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        const lib = JSON.parse(localStorage.getItem('darkmine_library') || '[]');
        const projectsWithMarkets = (data || []).map((project: any) => {
          const localCard = lib.find((c: any) => c.id === project.id);
          return { ...project, analyzedMarkets: localCard?.analyzedMarkets || [] };
        });
        setProjects(projectsWithMarkets);
      } catch {
        const lib = JSON.parse(localStorage.getItem('darkmine_library') || '[]');
        setProjects(lib);
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchProjects();
    fetchChannels();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectTitle.trim()) return;
    setIsCreatingProject(true);
    setModalError(null);

    try {
      let referencePdfValue = '';
      if (newProjectPdfFile) {
        const formData = new FormData();
        formData.append('file', newProjectPdfFile);
        const uploadRes = await fetch('/api/projects/upload', {
          method: 'POST',
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.success) {
          referencePdfValue = JSON.stringify({
            filename: uploadData.filename,
            text: uploadData.text || ''
          });
        } else {
          throw new Error(uploadData.error || 'Erro no upload do PDF');
        }
      }

      let createdProject = null;
      if (supabase) {
        const { data, error } = await supabase
          .from('projects')
          .insert({
            title_original: newProjectTitle.trim(),
            market: newProjectMarket.trim(),
            channel_name: newProjectChannelName || null,
            reference_pdf: referencePdfValue || null,
            status: newProjectStatus,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) {
          console.error('Erro ao salvar no Supabase:', error);
          throw error;
        }
        createdProject = { ...data, analyzedMarkets: [] };
      }

      if (!createdProject) {
        // LocalStorage Fallback
        const newId = crypto.randomUUID();
        createdProject = {
          id: newId,
          title_original: newProjectTitle.trim(),
          market: newProjectMarket.trim(),
          channel_name: newProjectChannelName || null,
          reference_pdf: referencePdfValue || null,
          status: newProjectStatus,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          analyzedMarkets: []
        };
        const lib = JSON.parse(localStorage.getItem('darkmine_library') || '[]');
        localStorage.setItem('darkmine_library', JSON.stringify([createdProject, ...lib]));
      }

      setProjects(prev => [createdProject, ...prev]);
      
      // Reset form & close modal
      setNewProjectTitle('');
      setNewProjectMarket('🇧🇷 PT-BR');
      setNewProjectChannelName('');
      setNewProjectStatus('hook');
      setNewProjectPdfFile(null);
      setShowNewProjectModal(false);
    } catch (err: any) {
      console.error('Erro ao criar projeto:', err);
      setModalError(err.message || 'Erro ao criar projeto');
    } finally {
      setIsCreatingProject(false);
    }
  };

  const fetchChannels = async () => {
    setLoadingChannels(true);
    try {
      const res = await fetch('/api/channels');
      const json = await res.json();
      setChannels(json.channels || []);
    } finally {
      setLoadingChannels(false);
    }
  };

  const openNewChannel = () => { setEditingChannel(null); setDrawerOpen(true); };
  const openEditChannel = (ch: Channel) => { setEditingChannel(ch); setDrawerOpen(true); };

  const handleChannelSaved = (saved: Channel) => {
    setChannels(prev => {
      const idx = prev.findIndex(c => c.id === saved.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    setDrawerOpen(false);
  };

  const confirmDeleteChannel = (ch: Channel) => setChannelToDelete(ch);

  const executeDeleteChannel = async () => {
    if (!channelToDelete) return;
    setIsDeletingChannel(true);
    try {
      await fetch(`/api/channels/${channelToDelete.id}`, { method: 'DELETE' });
      setChannels(prev => prev.filter(c => c.id !== channelToDelete.id));
    } finally {
      setIsDeletingChannel(false);
      setChannelToDelete(null);
    }
  };

  const changeChannelStatus = async (ch: Channel, newStatus: ChannelStatus) => {
    try {
      const res = await fetch(`/api/channels/${ch.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...ch, status: newStatus }),
      });
      const json = await res.json();
      setChannels(prev => prev.map(c => c.id === ch.id ? { ...c, status: newStatus } : c));
    } catch (e) {
      console.error(e);
    }
  };

  // ── Projects logic ───────────────────────────────────────────────────────
  const updateStatus = async (id: string, newStatus: string) => {
    try {
      if (!supabase) throw new Error('Supabase não configurado');
      const { error } = await supabase.from('projects').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      setProjects(projects.map(p => p.id === id ? { ...p, status: newStatus } : p));
    } catch (e) { console.error('Erro ao atualizar status:', e); }
  };

  const confirmDeleteProject = (id: string, title: string) => setProjectToDelete({ id, title });

  const executeDeleteProject = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    try {
      if (!supabase) throw new Error('Supabase não configurado');
      const { error } = await supabase.from('projects').delete().eq('id', projectToDelete.id);
      if (error) throw error;
      setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
    } finally {
      setIsDeleting(false);
      setProjectToDelete(null);
    }
  };

  const onDragEnd = async (result: any) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    const newStatus = destination.droppableId;
    setProjects(prev => prev.map(p => p.id === draggableId ? { ...p, status: newStatus } : p));
    try {
      if (!supabase) throw new Error('Supabase não configurado');
      const { error } = await supabase.from('projects').update({ status: newStatus }).eq('id', draggableId);
      if (error) throw error;
    } catch (e) {
      console.error('Erro ao mover card:', e);
      setProjects(prev => prev.map(p => p.id === draggableId ? { ...p, status: source.droppableId } : p));
    }
  };

  const prodColumns = [
    { id: 'hook', title: '📥 Mineração', color: 'border-orange-500/30' },
    { id: 'script', title: '⏳ Títulos Prontos', color: 'border-purple-500/30' },
    { id: 'produzido', title: '✅ Roteiros Finalizados', color: 'border-emerald-500/30' },
    { id: 'edicao', title: '🎬 Edição de Vídeo', color: 'border-blue-500/30' },
    { id: 'publicado', title: '🚀 Publicado', color: 'border-rose-500/30' },
  ];

  // ── Channels helpers ────────────────────────────────────────────────────
  const filteredChannels = channels.filter(ch => {
    if (filterStatus !== 'all' && ch.status !== filterStatus) return false;
    if (filterNiche && !ch.niche.toLowerCase().includes(filterNiche.toLowerCase())) return false;
    if (filterLang && ch.language !== filterLang) return false;
    return true;
  });

  const uniqueNiches = Array.from(new Set(channels.map(c => c.niche)));

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loadingProjects) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="w-8 h-8 animate-spin text-orange-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm text-gray-400">Carregando biblioteca...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid-bg relative text-gray-200">
      <div className="fixed top-0 left-1/4 w-96 h-96 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)', filter: 'blur(40px)' }} />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5" style={{ background: 'rgba(8,11,18,0.85)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-[1800px] w-full mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 0 16px rgba(249,115,22,0.4)' }}>
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white">DarkMine</span>
              <span className="ml-2 text-[10px] font-mono text-orange-500/70 uppercase tracking-widest hidden sm:inline">Biblioteca</span>
            </div>
          </div>
          <Link href="/" className="relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-300 border border-white/10 transition-all hover:border-purple-500/40 hover:text-purple-300 hover:bg-purple-950/20">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 00-1 1v4a1 1 0 001 1h3m-6 0h6" />
            </svg>
            Voltar à Mineração
          </Link>
        </div>
      </header>

      <main className="max-w-[1800px] w-full mx-auto px-6 py-10">

        {/* Tab switcher */}
        <div className="flex items-center gap-1 mb-8 p-1 rounded-xl bg-white/[0.04] border border-white/10 w-fit">
          <button
            onClick={() => setTab('producao')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'producao' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Esteira de Produção
          </button>
          <button
            onClick={() => setTab('canais')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'canais' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Canais
            {channels.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded font-mono">{channels.length}</span>
            )}
          </button>
        </div>

        {/* ── PRODUÇÃO TAB ─────────────────────────────────────────────────── */}
        {tab === 'producao' && (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-black text-white flex items-center gap-3">
                  📚 <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-orange-600">Esteira de Produção</span>
                </h1>
                <p className="text-sm text-gray-400 mt-1 font-mono">Organize e exporte suas ideias mineradas.</p>
              </div>
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="h-10 px-5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold transition-colors shadow-lg shadow-orange-500/20 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Novo Card
              </button>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
              <div className="flex flex-nowrap overflow-x-auto pb-8 gap-6 items-start" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                {prodColumns.map(col => (
                  <Droppable key={col.id} droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`rounded-2xl p-4 kanban-column border flex flex-col gap-4 min-h-[500px] min-w-[320px] max-w-[350px] flex-shrink-0 transition-colors duration-300 ${col.color} ${snapshot.isDraggingOver ? 'bg-white/5' : ''}`}
                      >
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-300">{col.title}</h2>
                          <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded font-mono text-gray-400">
                            {(projects || []).filter(p => (p.status || 'hook') === col.id).length}
                          </span>
                        </div>
                        <div className="flex flex-col gap-3 min-h-[150px]">
                          {(projects || []).filter(p => (p.status || 'hook') === col.id).map((project, index) => {
                            const targetMarket = project.market || 'Brasil (PT-BR)';
                            const titleOriginal = project.title_original || 'Sem título';
                            const titleFinal = project.title_final;
                            return (
                              <Draggable key={project.id} draggableId={project.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    style={provided.draggableProps.style}
                                    onClick={() => setSelectedProject(project)}
                                    className={`bg-black/40 border border-white/5 rounded-xl p-3 flex flex-col gap-3 transition-colors cursor-pointer ${['produzido', 'publicado'].includes(col.id) ? 'opacity-50 grayscale hover:grayscale-0' : 'hover:border-white/20'} ${snapshot.isDragging ? 'shadow-2xl bg-gray-900 border-white/20 z-[9999]' : ''}`}
                                  >
                                    <div className="flex flex-col gap-2 relative">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 flex-wrap max-w-[85%]">
                                          <span className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded border border-cyan-500/30 text-cyan-400 bg-cyan-900/20">
                                            {targetMarket}
                                          </span>
                                          {project.channel_name && (
                                            <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded border border-violet-500/30 text-violet-400 bg-violet-900/20" title={project.channel_name}>
                                              SKU: {project.channel_name}
                                            </span>
                                          )}
                                          {project.reference_pdf && (() => {
                                            let displayFilename = 'PDF';
                                            try {
                                              if (project.reference_pdf.startsWith('{')) {
                                                const parsed = JSON.parse(project.reference_pdf);
                                                displayFilename = parsed.filename || 'PDF';
                                              } else {
                                                displayFilename = project.reference_pdf;
                                              }
                                            } catch {}
                                            return (
                                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-amber-500/30 text-amber-400 bg-amber-900/20 inline-flex items-center gap-1" title={displayFilename}>
                                                📎 {displayFilename.length > 15 ? displayFilename.substring(0, 15) + '...' : displayFilename}
                                              </span>
                                            );
                                          })()}
                                          {project.analyzedMarkets?.map((market: any) => (
                                            <span
                                              key={market.langCode}
                                              className={`text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${market.status === 'blue_ocean' ? 'bg-cyan-900/20 border-cyan-400/50 text-cyan-300' : 'bg-red-900/10 border-red-500/20 text-red-400/70'}`}
                                            >
                                              #{market.langCode}
                                            </span>
                                          ))}
                                        </div>
                                         <div className="flex items-center gap-1 flex-shrink-0">
                                           <button
                                             type="button"
                                             onClick={(e) => { e.stopPropagation(); setSelectedProject(project); }}
                                             className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
                                             title="Visualizar Detalhes"
                                           >
                                             <Eye className="w-3.5 h-3.5" />
                                           </button>
                                           <button
                                             type="button"
                                             onClick={(e) => { e.stopPropagation(); confirmDeleteProject(project.id, titleFinal || titleOriginal); }}
                                             className="p-1 rounded text-gray-500 hover:text-red-500 hover:bg-red-500/10 transition-colors flex-shrink-0"
                                           >
                                             <Trash2 className="w-3.5 h-3.5" />
                                           </button>
                                         </div>
                                       </div>
                                       <button
                                         type="button"
                                         onClick={(e) => { e.stopPropagation(); setSelectedProject(project); }}
                                         className="text-left w-full group"
                                       >
                                         <h3 className={`text-sm line-clamp-2 leading-tight group-hover:text-orange-400 transition-colors ${titleFinal ? 'text-emerald-300 font-bold' : 'font-medium text-gray-200'}`} title={titleFinal || titleOriginal}>
                                           {titleFinal ? `✨ ${titleFinal}` : titleOriginal}
                                         </h3>
                                       </button>
                                      <div className="flex gap-2 mt-2">
                                        <Link 
                                          onClick={(e) => e.stopPropagation()}
                                          href={`/hook?title=${encodeURIComponent(titleOriginal)}&id=${project.id}`} 
                                          className="text-[10px] px-2 py-1 rounded bg-white/5 text-gray-400 hover:text-white border border-white/10 hover:border-white/30 transition-colors"
                                        >
                                          🎣 Hook
                                        </Link>
                                        <Link 
                                          onClick={(e) => e.stopPropagation()}
                                          href={`/script?title=${encodeURIComponent(titleFinal || titleOriginal)}&id=${project.id}`} 
                                          className="text-[10px] px-2 py-1 rounded bg-violet-900/30 text-violet-300 hover:text-white border border-violet-500/30 hover:bg-violet-800/50 transition-colors"
                                        >
                                          📝 Script
                                        </Link>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                          {(projects || []).filter(p => (p.status || 'hook') === col.id).length === 0 && (
                            <div className="py-10 text-center opacity-40 text-[10px] font-mono text-gray-400 pointer-events-none">
                              Arraste cards para cá
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </Droppable>
                ))}
              </div>
            </DragDropContext>
          </>
        )}

        {/* ── CANAIS TAB ───────────────────────────────────────────────────── */}
        {tab === 'canais' && (
          <>
            {/* Channels header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-black text-white flex items-center gap-3">
                  📡 <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-violet-600">
                    Canais ({channels.length})
                  </span>
                </h1>
                <p className="text-sm text-gray-400 mt-1 font-mono">Configure os canais como SKU da sua operação.</p>
              </div>
              <div className="flex items-center gap-3">
                {/* View toggle */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/10">
                  <button
                    onClick={() => setChannelView('kanban')}
                    title="Kanban"
                    className={`p-2 rounded-lg transition-colors ${channelView === 'kanban' ? 'bg-violet-500/20 text-violet-300' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setChannelView('tabela')}
                    title="Tabela"
                    className={`p-2 rounded-lg transition-colors ${channelView === 'tabela' ? 'bg-violet-500/20 text-violet-300' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18M10 4v16M6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" />
                    </svg>
                  </button>
                </div>
                <button
                  onClick={openNewChannel}
                  className="h-10 px-5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors shadow-lg shadow-violet-500/20 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Novo Canal
                </button>
              </div>
            </div>

            {loadingChannels ? (
              <div className="flex items-center justify-center py-20">
                <svg className="w-8 h-8 animate-spin text-violet-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : channels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-2xl bg-violet-900/20 border border-violet-500/20 flex items-center justify-center mb-4 text-3xl">📡</div>
                <h3 className="text-lg font-bold text-white mb-2">Nenhum canal ainda</h3>
                <p className="text-sm text-gray-500 mb-6 max-w-xs">Crie seu primeiro canal para organizar nicho, persona e referências em um lugar só.</p>
                <button onClick={openNewChannel} className="h-10 px-6 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors shadow-lg shadow-violet-500/20">
                  + Novo Canal
                </button>
              </div>
            ) : channelView === 'kanban' ? (
              /* KANBAN VIEW */
              <div className="flex flex-nowrap overflow-x-auto pb-8 gap-6 items-start" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                {CHANNEL_COLS.map(col => {
                  const colChannels = channels.filter(c => c.status === col.id);
                  return (
                    <div key={col.id} className={`rounded-2xl p-4 border flex flex-col gap-4 min-h-[400px] min-w-[320px] max-w-[360px] flex-shrink-0 ${col.color}`}>
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-300">{col.title}</h2>
                        <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded font-mono text-gray-400">{colChannels.length}</span>
                      </div>
                      <div className="flex flex-col gap-3">
                        {colChannels.map(ch => (
                          <ChannelCard
                            key={ch.id}
                            channel={ch}
                            onEdit={() => openEditChannel(ch)}
                            onDelete={() => confirmDeleteChannel(ch)}
                            onStatusChange={(s) => changeChannelStatus(ch, s)}
                          />
                        ))}
                        {colChannels.length === 0 && (
                          <div className="py-10 text-center opacity-40 text-[10px] font-mono text-gray-400">
                            Nenhum canal aqui
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* TABLE VIEW */
              <>
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <div className="flex items-center gap-1">
                    {(['all', 'ativo', 'pausado', 'arquivado'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setFilterStatus(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${filterStatus === s ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'border-white/10 text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                      >
                        {s === 'all' ? 'Todos' : s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                  <select
                    value={filterNiche}
                    onChange={e => setFilterNiche(e.target.value)}
                    className="bg-white/[0.04] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-300 focus:outline-none"
                  >
                    <option value="" className="bg-[#0d1017]">Todos os nichos</option>
                    {uniqueNiches.map(n => <option key={n} value={n} className="bg-[#0d1017]">{n}</option>)}
                  </select>
                  <select
                    value={filterLang}
                    onChange={e => setFilterLang(e.target.value)}
                    className="bg-white/[0.04] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-300 focus:outline-none"
                  >
                    <option value="" className="bg-[#0d1017]">Todos os idiomas</option>
                    <option value="pt" className="bg-[#0d1017]">Português</option>
                    <option value="en" className="bg-[#0d1017]">Inglês</option>
                    <option value="es" className="bg-[#0d1017]">Espanhol</option>
                  </select>
                </div>

                <div className="rounded-2xl border border-white/10 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.03]">
                        {['Nome', 'Nicho', 'Subnicho', 'Idioma', 'Formato', 'Status', 'Personagens', 'Atualizado'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredChannels.map((ch, i) => (
                        <tr
                          key={ch.id}
                          onClick={() => openEditChannel(ch)}
                          className={`border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors cursor-pointer ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}
                        >
                          <td className="px-4 py-3 font-semibold text-white">{ch.name}</td>
                          <td className="px-4 py-3 text-gray-400">{ch.niche}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{ch.sub_niche || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${LANG_COLOR[ch.language] || 'text-gray-400'}`}>
                              {LANG_LABEL[ch.language] || ch.language}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{ch.video_format || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLOR[ch.status]}`}>
                              {ch.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{(ch.characters?.length ?? 0)}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs font-mono">
                            {new Date(ch.updated_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <button onClick={() => confirmDeleteChannel(ch)} className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredChannels.length === 0 && (
                        <tr>
                          <td colSpan={9} className="px-4 py-10 text-center text-gray-600 text-sm">Nenhum canal corresponde aos filtros.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* Delete project modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0f111a] border border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.15)] rounded-2xl w-full max-w-md p-6 m-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0 text-red-500">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Excluir Projeto</h3>
            </div>
            <p className="text-gray-400 text-sm mb-6">
              Tem certeza que deseja excluir o projeto <span className="text-gray-200 font-semibold">"{projectToDelete.title}"</span>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setProjectToDelete(null)} disabled={isDeleting} className="px-4 py-2 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors">
                Cancelar
              </button>
              <button onClick={executeDeleteProject} disabled={isDeleting} className="px-4 py-2 rounded-xl bg-red-600/90 hover:bg-red-500 text-white text-sm font-bold shadow-lg shadow-red-500/20 transition-all flex items-center gap-2">
                {isDeleting ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Excluindo...</> : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete channel modal */}
      {channelToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0f111a] border border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.15)] rounded-2xl w-full max-w-md p-6 m-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0 text-red-500">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Excluir Canal</h3>
            </div>
            <p className="text-gray-400 text-sm mb-6">
              Tem certeza que deseja excluir o canal <span className="text-gray-200 font-semibold">"{channelToDelete.name}"</span>? Todos os personagens e imagens serão removidos.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setChannelToDelete(null)} disabled={isDeletingChannel} className="px-4 py-2 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors">
                Cancelar
              </button>
              <button onClick={executeDeleteChannel} disabled={isDeletingChannel} className="px-4 py-2 rounded-xl bg-red-600/90 hover:bg-red-500 text-white text-sm font-bold shadow-lg shadow-red-500/20 transition-all flex items-center gap-2">
                {isDeletingChannel ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Excluindo...</> : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Channel Drawer */}
      {drawerOpen && (
        <ChannelDrawer
          channel={editingChannel}
          onClose={() => setDrawerOpen(false)}
          onSaved={handleChannelSaved}
        />
      )}

      {/* New Project Card Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0b0e14] border border-white/10 shadow-[0_0_50px_rgba(249,115,22,0.15)] rounded-2xl w-full max-w-lg p-6 m-4 relative max-h-[90vh] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
              <div className="flex items-center gap-2">
                <span className="text-xl">📥</span>
                <h3 className="text-lg font-black text-white">Criar Novo Card</h3>
              </div>
              <button 
                onClick={() => {
                  setShowNewProjectModal(false);
                  setModalError(null);
                }} 
                className="text-gray-500 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-xl border border-red-500/30 bg-red-950/20 text-red-400 text-xs font-medium">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Título Original do Vídeo <span className="text-orange-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newProjectTitle}
                  onChange={e => setNewProjectTitle(e.target.value)}
                  placeholder="Ex: 7 Hábitos Secretos dos Homens Altamente Atraentes"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/60 focus:bg-white/[0.05] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Idioma / Mercado <span className="text-orange-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newProjectMarket}
                  onChange={e => setNewProjectMarket(e.target.value)}
                  placeholder="Ex: 🇧🇷 PT-BR"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/60 focus:bg-white/[0.05] transition-colors"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setNewProjectMarket('🇧🇷 PT-BR')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${newProjectMarket === '🇧🇷 PT-BR' ? 'bg-orange-500/20 border-orange-500/40 text-orange-300' : 'border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
                  >
                    🇧🇷 PT-BR
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewProjectMarket('🇲🇽 ES-MX')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${newProjectMarket === '🇲🇽 ES-MX' ? 'bg-orange-500/20 border-orange-500/40 text-orange-300' : 'border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
                  >
                    🇲🇽 ES-MX
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Canal de Referência (SKU)
                </label>
                <div className="relative">
                  <select
                    value={newProjectChannelName}
                    onChange={e => setNewProjectChannelName(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-orange-500/60 transition-colors appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-[#0d1017]">Selecionar canal SKU (opcional)</option>
                    {channels.map(ch => (
                      <option key={ch.id} value={ch.name} className="bg-[#0d1017]">{ch.name} ({ch.niche})</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Status Inicial
                </label>
                <div className="relative">
                  <select
                    value={newProjectStatus}
                    onChange={e => setNewProjectStatus(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-orange-500/60 transition-colors appearance-none cursor-pointer"
                  >
                    {prodColumns.map(col => (
                      <option key={col.id} value={col.id} className="bg-[#0d1017]">{col.title}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Anexo de Referências (Roteiros, Títulos, Imagem - PDF)
                </label>
                <div className="relative border border-dashed border-white/10 hover:border-orange-500/40 rounded-xl p-4 transition-all bg-white/[0.01] hover:bg-white/[0.02]">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={e => setNewProjectPdfFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center gap-2 text-center">
                    <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    {newProjectPdfFile ? (
                      <span className="text-sm font-semibold text-emerald-400 font-mono flex items-center gap-1.5">
                        📎 {newProjectPdfFile.name} ({(newProjectPdfFile.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">
                        Clique ou arraste um arquivo PDF
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewProjectModal(false);
                    setModalError(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingProject}
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2"
                >
                  {isCreatingProject ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Salvando...
                    </>
                  ) : (
                    'Criar Card'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedProject && (
        <ProjectDetailsModal
          project={selectedProject}
          channels={channels}
          onClose={() => setSelectedProject(null)}
          onSaved={handleProjectSaved}
        />
      )}
    </div>
  );
}

// ── ChannelCard ─────────────────────────────────────────────────────────────
function ChannelCard({
  channel,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  channel: Channel;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (s: ChannelStatus) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const chars = channel.characters || [];
  const refCount = channel.ref_titles?.length ?? 0;
  const transcriptCount = (channel.ref_transcripts as any[])?.length ?? 0;

  const nextStatus: Record<ChannelStatus, { label: string; value: ChannelStatus }> = {
    ativo: { label: 'Pausar', value: 'pausado' },
    pausado: { label: 'Ativar', value: 'ativo' },
    arquivado: { label: 'Ativar', value: 'ativo' },
  };

  return (
    <div
      onClick={onEdit}
      className="bg-black/40 border border-white/5 hover:border-violet-500/30 rounded-xl p-4 flex flex-col gap-3 cursor-pointer transition-colors relative"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-white text-sm leading-tight">{channel.name}</h3>
        <button
          onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
          className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>
        {menuOpen && (
          <div className="absolute top-10 right-3 z-10 bg-[#141720] border border-white/10 rounded-xl shadow-2xl py-1 min-w-[140px]" onClick={e => e.stopPropagation()}>
            <button onClick={() => { onEdit(); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors">
              Editar
            </button>
            <button onClick={() => { onStatusChange(nextStatus[channel.status].value); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors">
              {nextStatus[channel.status].label}
            </button>
            <button onClick={() => { onStatusChange('arquivado'); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors">
              Arquivar
            </button>
            <div className="border-t border-white/10 my-1" />
            <button onClick={() => { onDelete(); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
              Excluir
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-900/30 border border-violet-500/30 text-violet-300">
          {channel.niche}
        </span>
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${LANG_COLOR[channel.language] || 'text-gray-400'}`}>
          {LANG_LABEL[channel.language] || channel.language}
        </span>
      </div>

      {chars.length > 0 && (
        <div className="flex items-center gap-1">
          {chars.slice(0, 4).map(c => (
            c.image_url ? (
              <img key={c.id} src={c.image_url} alt={c.name} title={c.name} className="w-7 h-7 rounded-full object-cover border border-white/10" />
            ) : (
              <div key={c.id} title={c.name} className="w-7 h-7 rounded-full bg-violet-900/40 border border-violet-500/20 flex items-center justify-center text-[10px] text-violet-300 font-bold">
                {c.name[0]?.toUpperCase()}
              </div>
            )
          ))}
          {chars.length > 4 && (
            <div className="w-7 h-7 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-[10px] text-gray-400">
              +{chars.length - 4}
            </div>
          )}
        </div>
      )}

      <div className="text-[10px] text-gray-600 font-mono">
        {refCount} títulos ref. · {transcriptCount} transcrições
      </div>
    </div>
  );
}
