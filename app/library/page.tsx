'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { supabase } from '../../lib/supabase';

export default function LibraryPage() {
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [projectToDelete, setProjectToDelete] = useState<{ id: string, title: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                if (!supabase) throw new Error('Supabase não configurado');
                const { data, error } = await supabase
                    .from('projects')
                    .select('*')
                    .order('created_at', { ascending: false });
                
                if (error) throw error;
                setProjects(data || []);
            } catch (error) {
                console.error('Erro ao buscar projetos:', error);
                setProjects([]);
            } finally {
                setLoading(false);
            }
        };
        fetchProjects();
    }, []);

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            if (!supabase) throw new Error('Supabase não configurado');
            const { error } = await supabase
                .from('projects')
                .update({ status: newStatus })
                .eq('id', id);
            if (error) throw error;
            setProjects(projects.map(p => p.id === id ? { ...p, status: newStatus } : p));
        } catch (e) {
            console.error('Erro ao atualizar status:', e);
        }
    };

    const confirmDeleteProject = (id: string, title: string) => {
        setProjectToDelete({ id, title });
    };

    const executeDeleteProject = async () => {
        if (!projectToDelete) return;
        setIsDeleting(true);
        try {
            if (!supabase) throw new Error('Supabase não configurado');
            const { error } = await supabase
                .from('projects')
                .delete()
                .eq('id', projectToDelete.id);
            if (error) throw error;
            setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
        } catch (e) {
            console.error('Erro ao excluir projeto:', e);
        } finally {
            setIsDeleting(false);
            setProjectToDelete(null);
        }
    };

    const onDragEnd = async (result: any) => {
        if (!result.destination) return;
        const { source, destination, draggableId } = result;

        // Se soltou no mesmo lugar, não faz nada
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const newStatus = destination.droppableId;

        // Atualização otimista — move o card na UI imediatamente
        setProjects(prev => prev.map(p => p.id === draggableId ? { ...p, status: newStatus } : p));

        // Persiste no Supabase em background
        try {
            if (!supabase) throw new Error('Supabase não configurado');
            const { error } = await supabase
                .from('projects')
                .update({ status: newStatus })
                .eq('id', draggableId);
            if (error) throw error;
        } catch (e) {
            console.error('Erro ao mover card:', e);
            // Rollback — reverte para o status anterior
            setProjects(prev => prev.map(p => p.id === draggableId ? { ...p, status: source.droppableId } : p));
        }
    };

    const columns = [
        { id: 'hook', title: '📥 Mineração', color: 'border-orange-500/30' },
        { id: 'script', title: '⏳ Títulos Prontos', color: 'border-purple-500/30' },
        { id: 'produzido', title: '✅ Roteiros Finalizados', color: 'border-emerald-500/30' }
    ];

    if (loading) {
        return (
            <div className="min-h-screen grid-bg flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <svg className="w-8 h-8 animate-spin text-orange-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    <span className="text-sm text-gray-400">Carregando projetos...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen grid-bg relative text-gray-200">
            {/* Ambient glow blobs */}
            <div className="fixed top-0 left-1/4 w-96 h-96 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)', filter: 'blur(40px)' }} />

            {/* HEADER */}
            <header className="sticky top-0 z-50 border-b border-white/5" style={{ background: 'rgba(8,11,18,0.85)', backdropFilter: 'blur(20px)' }}>
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
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

                    <div className="flex items-center gap-3">
                        <Link href="/" className="relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-300 border border-white/10 transition-all hover:border-purple-500/40 hover:text-purple-300 hover:bg-purple-950/20">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            Voltar à Mineração
                        </Link>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT */}
            <main className="max-w-7xl mx-auto px-6 py-10">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-black text-white flex items-center gap-3">
                            📚 <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-orange-600">Esteira de Produção</span>
                        </h1>
                        <p className="text-sm text-gray-400 mt-1 font-mono">Organize e exporte suas ideias mineradas.</p>
                    </div>
                </div>

                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {columns.map(col => (
                            <Droppable key={col.id} droppableId={col.id}>
                                {(provided, snapshot) => (
                                    <div 
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className={`rounded-2xl p-4 kanban-column border flex flex-col gap-4 min-h-[500px] transition-colors duration-300 ${col.color} ${snapshot.isDraggingOver ? 'bg-white/5' : ''}`}
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
                                                                className={`bg-black/40 border border-white/5 rounded-xl p-3 flex flex-col gap-3 transition-colors ${col.id === 'produzido' ? 'opacity-50 grayscale hover:grayscale-0' : 'hover:border-white/20'} ${snapshot.isDragging ? 'shadow-2xl bg-gray-900 border-white/20 z-[9999]' : ''}`}
                                                            >
                                                                    <div className="flex flex-col gap-2 relative">
                                                                        {/* Line 1: Tags & Delete */}
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className={`text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded border ${targetMarket.includes('Brasil') ? 'border-cyan-500/30 text-cyan-400 bg-cyan-900/20' : 'border-red-500/30 text-red-400 bg-red-900/20'}`}>
                                                                                    {targetMarket.includes('Brasil') ? '🇧🇷 PT-BR' : '🇲🇽 ES-MX'}
                                                                                </span>
                                                                            </div>
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    confirmDeleteProject(project.id, titleFinal || titleOriginal);
                                                                                }}
                                                                                className="p-1 rounded text-gray-500 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                                                                title="Excluir projeto"
                                                                            >
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </div>

                                                                        {/* Line 2: Title */}
                                                                        <h3 className={`text-sm line-clamp-2 leading-tight ${titleFinal ? 'text-emerald-300 font-bold' : 'font-medium text-gray-200'}`} title={titleFinal || titleOriginal}>
                                                                            {titleFinal ? `✨ ${titleFinal}` : titleOriginal}
                                                                        </h3>

                                                                        {/* Actions */}
                                                                        <div className="flex gap-2 mt-2">
                                                                            <Link href={`/hook?title=${encodeURIComponent(titleOriginal)}&id=${project.id}`} className="text-[10px] px-2 py-1 rounded bg-white/5 text-gray-400 hover:text-white border border-white/10 hover:border-white/30 transition-colors">
                                                                                🎣 Hook
                                                                            </Link>
                                                                            {titleFinal && (
                                                                                <Link href={`/script?title=${encodeURIComponent(titleFinal)}&id=${project.id}`} className="text-[10px] px-2 py-1 rounded bg-violet-900/30 text-violet-300 hover:text-white border border-violet-500/30 hover:bg-violet-800/50 transition-colors">
                                                                                    📝 Script
                                                                                </Link>
                                                                            )}
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
            </main>

            {/* Custom Delete Confirmation Modal */}
            {projectToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#0f111a] border border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.15)] rounded-2xl w-full max-w-md p-6 relative overflow-hidden m-4">
                        {/* Ambient background for modal */}
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/10 rounded-full blur-[40px] pointer-events-none" />
                        
                        <div className="flex items-center gap-4 mb-4 relative z-10">
                            <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0 text-red-500">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-bold text-white">Excluir Projeto</h3>
                        </div>
                        
                        <p className="text-gray-400 text-sm mb-6 relative z-10">
                            Tem certeza que deseja excluir o projeto <span className="text-gray-200 font-semibold">"{projectToDelete.title}"</span>? Esta ação não pode ser desfeita.
                        </p>
                        
                        <div className="flex items-center justify-end gap-3 relative z-10">
                            <button 
                                onClick={() => setProjectToDelete(null)}
                                disabled={isDeleting}
                                className="px-4 py-2 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={executeDeleteProject}
                                disabled={isDeleting}
                                className="px-4 py-2 rounded-xl bg-red-600/90 hover:bg-red-500 text-white text-sm font-bold shadow-lg shadow-red-500/20 transition-all flex items-center gap-2"
                            >
                                {isDeleting ? (
                                    <>
                                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                        Excluindo...
                                    </>
                                ) : (
                                    'Sim, Excluir'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
