'use client';

import { useState, useRef, useEffect } from 'react';
import type { Channel, ChannelCharacter, ChannelStatus } from '../types/database';

interface RefTranscript {
  title: string;
  transcript: string;
}

interface PendingCharacter {
  name: string;
  file: File | null;
  previewUrl: string | null;
}

interface Props {
  channel?: Channel | null;
  onClose: () => void;
  onSaved: (channel: Channel) => void;
}

const LANGUAGE_OPTIONS = [
  { value: 'pt', label: 'Português' },
  { value: 'en', label: 'Inglês' },
  { value: 'es', label: 'Espanhol' },
];

const STATUS_OPTIONS: { value: ChannelStatus; label: string }[] = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'pausado', label: 'Pausado' },
  { value: 'arquivado', label: 'Arquivado' },
];

export default function ChannelDrawer({ channel, onClose, onSaved }: Props) {
  const isEdit = !!channel;

  const [name, setName] = useState(channel?.name ?? '');
  const [niche, setNiche] = useState(channel?.niche ?? '');
  const [subNiche, setSubNiche] = useState(channel?.sub_niche ?? '');
  const [language, setLanguage] = useState(channel?.language ?? 'pt');
  const [videoFormat, setVideoFormat] = useState(channel?.video_format ?? '');
  const [status, setStatus] = useState<ChannelStatus>(channel?.status ?? 'ativo');
  const [persona, setPersona] = useState(channel?.persona ?? '');
  const [refTitles, setRefTitles] = useState(
    (channel?.ref_titles ?? []).join('\n')
  );
  const [transcripts, setTranscripts] = useState<RefTranscript[]>(
    channel?.ref_transcripts ?? []
  );
  const [characters, setCharacters] = useState<ChannelCharacter[]>(
    channel?.characters ?? []
  );
  const [pendingChar, setPendingChar] = useState<PendingCharacter | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingChar, setIsSavingChar] = useState(false);
  const [deletingCharId, setDeletingCharId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const addTranscript = () => {
    if (transcripts.length >= 3) return;
    setTranscripts(prev => [...prev, { title: '', transcript: '' }]);
  };

  const updateTranscript = (idx: number, field: keyof RefTranscript, value: string) => {
    setTranscripts(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };

  const removeTranscript = (idx: number) => {
    setTranscripts(prev => prev.filter((_, i) => i !== idx));
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Imagem deve ter no máximo 5MB.'); return; }
    const url = URL.createObjectURL(file);
    setPendingChar(prev => prev ? { ...prev, file, previewUrl: url } : { name: '', file, previewUrl: url });
  };

  const saveCharacter = async () => {
    if (!pendingChar?.name.trim()) { setError('Nome do personagem é obrigatório.'); return; }
    if (!channel?.id) { setError('Salve o canal antes de adicionar personagens.'); return; }
    setIsSavingChar(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('name', pendingChar.name);
      if (pendingChar.file) fd.append('image', pendingChar.file);
      const res = await fetch(`/api/channels/${channel.id}/characters`, { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setCharacters(prev => [...prev, json.character]);
      setPendingChar(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSavingChar(false);
    }
  };

  const deleteCharacter = async (charId: string) => {
    if (!channel?.id) return;
    setDeletingCharId(charId);
    try {
      await fetch(`/api/channels/${channel.id}/characters/${charId}`, { method: 'DELETE' });
      setCharacters(prev => prev.filter(c => c.id !== charId));
    } finally {
      setDeletingCharId(null);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !niche.trim()) { setError('Nome e Nicho são obrigatórios.'); return; }
    setIsSaving(true);
    setError('');
    try {
      const payload = {
        name,
        niche,
        sub_niche: subNiche || null,
        persona: persona || null,
        video_format: videoFormat || null,
        language,
        status,
        ref_titles: refTitles.split('\n').map(t => t.trim()).filter(Boolean).slice(0, 10),
        ref_transcripts: transcripts.filter(t => t.title || t.transcript),
        ref_scripts: channel?.ref_scripts ?? [],
      };
      const url = isEdit ? `/api/channels/${channel!.id}` : '/api/channels';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      onSaved({ ...json.channel, characters });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[520px] flex flex-col bg-[#0d1017] border-l border-white/10 shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
          <h2 className="text-base font-bold text-white">
            {isEdit ? 'Editar Canal' : 'Novo Canal'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>

          {/* SEÇÃO 1 — IDENTIDADE */}
          <section>
            <SectionTitle>Identidade</SectionTitle>
            <div className="space-y-4">
              <Field label="Nome do Canal" required>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Dark Horticultura"
                  className={inputCls}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Nicho" required>
                  <input value={niche} onChange={e => setNiche(e.target.value)} placeholder="Ex: Cultivo tropical" className={inputCls} />
                </Field>
                <Field label="Subnicho">
                  <input value={subNiche} onChange={e => setSubNiche(e.target.value)} placeholder="Ex: Tomates em vaso" className={inputCls} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Idioma Principal">
                  <select value={language} onChange={e => setLanguage(e.target.value)} className={selectCls}>
                    {LANGUAGE_OPTIONS.map(o => <option key={o.value} value={o.value} className="bg-[#0d1017]">{o.label}</option>)}
                  </select>
                </Field>
                <Field label="Status">
                  <select value={status} onChange={e => setStatus(e.target.value as ChannelStatus)} className={selectCls}>
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value} className="bg-[#0d1017]">{o.label}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Formato de Vídeo">
                <input value={videoFormat} onChange={e => setVideoFormat(e.target.value)} placeholder="Ex: time lapse, talking head, texto animado" className={inputCls} />
              </Field>
            </div>
          </section>

          <Divider />

          {/* SEÇÃO 2 — PERSONA */}
          <section>
            <SectionTitle>Persona</SectionTitle>
            <Field label="Persona / Contexto do Canal">
              <textarea
                value={persona}
                onChange={e => setPersona(e.target.value)}
                rows={6}
                placeholder="Descreva a persona, arquétipo, público-alvo e tom do canal. Ex: Canal dark estilo Attenborough, público 25-45 anos, tom contemplativo e educativo."
                className={`${inputCls} resize-y min-h-[120px]`}
              />
            </Field>
          </section>

          <Divider />

          {/* SEÇÃO 3 — REFERÊNCIAS */}
          <section>
            <SectionTitle>Referências</SectionTitle>
            <div className="space-y-4">
              <Field label="Títulos de Referência (um por linha, máx 10)">
                <textarea
                  value={refTitles}
                  onChange={e => setRefTitles(e.target.value)}
                  rows={5}
                  placeholder="Cole aqui os 10 melhores títulos desse canal, um por linha."
                  className={`${inputCls} resize-y`}
                />
              </Field>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={labelCls}>Transcrições de Referência ({transcripts.length}/3)</span>
                  {transcripts.length < 3 && (
                    <button
                      onClick={addTranscript}
                      className="text-[11px] text-violet-400 hover:text-violet-300 border border-violet-500/30 hover:border-violet-400/50 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      + Adicionar transcrição
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  {transcripts.map((t, i) => (
                    <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-gray-500 font-mono uppercase tracking-wider">Transcrição {i + 1}</span>
                        <button onClick={() => removeTranscript(i)} className="text-gray-500 hover:text-red-400 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <input
                        value={t.title}
                        onChange={e => updateTranscript(i, 'title', e.target.value)}
                        placeholder="Título do vídeo"
                        className={inputCls}
                      />
                      <textarea
                        value={t.transcript}
                        onChange={e => updateTranscript(i, 'transcript', e.target.value)}
                        rows={6}
                        placeholder="Cole a transcrição completa aqui..."
                        className={`${inputCls} resize-y`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <Divider />

          {/* SEÇÃO 4 — PERSONAGENS */}
          <section>
            <SectionTitle>Personagens</SectionTitle>

            {/* Existing characters */}
            {characters.length > 0 && (
              <div className="space-y-2 mb-4">
                {characters.map(c => (
                  <div key={c.id} className="flex items-center gap-3 bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2">
                    {c.image_url ? (
                      <img src={c.image_url} alt={c.name} className="w-9 h-9 rounded-full object-cover border border-white/10" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-violet-900/40 border border-violet-500/30 flex items-center justify-center text-sm text-violet-300 font-bold">
                        {c.name[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="flex-1 text-sm text-gray-300">{c.name}</span>
                    <button
                      onClick={() => deleteCharacter(c.id)}
                      disabled={deletingCharId === c.id}
                      className="text-gray-500 hover:text-red-400 transition-colors p-1"
                    >
                      {deletingCharId === c.id ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add character form */}
            {pendingChar !== null ? (
              <div className="rounded-xl border border-violet-500/30 bg-violet-900/10 p-4 space-y-3">
                <p className="text-[11px] text-violet-400 uppercase tracking-wider font-mono">Novo Personagem</p>
                <input
                  value={pendingChar.name}
                  onChange={e => setPendingChar(prev => prev ? { ...prev, name: e.target.value } : prev)}
                  placeholder="Nome do personagem"
                  className={inputCls}
                />

                <div>
                  {pendingChar.previewUrl && (
                    <img src={pendingChar.previewUrl} alt="preview" className="w-20 h-20 rounded-xl object-cover border border-white/10 mb-2" />
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] text-gray-400 hover:text-white border border-white/10 hover:border-white/30 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {pendingChar.previewUrl ? 'Trocar imagem' : 'Selecionar imagem'}
                  </button>
                  <span className="ml-2 text-[10px] text-gray-600">JPG, PNG, WEBP — máx 5MB</span>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImagePick} className="hidden" />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={saveCharacter}
                    disabled={isSavingChar}
                    className="flex-1 h-9 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isSavingChar ? (
                      <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Salvando...</>
                    ) : 'Salvar personagem'}
                  </button>
                  <button
                    onClick={() => setPendingChar(null)}
                    className="h-9 px-3 rounded-lg border border-white/10 text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setPendingChar({ name: '', file: null, previewUrl: null })}
                className="w-full h-10 rounded-xl border border-dashed border-white/20 hover:border-violet-500/50 text-gray-500 hover:text-violet-400 text-sm transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Adicionar personagem
              </button>
            )}
          </section>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-2 px-4 py-2 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 flex-shrink-0">
          <button onClick={onClose} className="h-10 px-5 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="h-10 px-6 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-violet-500/20"
          >
            {isSaving ? (
              <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Salvando...</>
            ) : (isEdit ? 'Salvar Alterações' : 'Criar Canal')}
          </button>
        </div>
      </div>
    </>
  );
}

const inputCls = 'w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-colors';
const selectCls = 'w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-violet-500/60 transition-colors appearance-none cursor-pointer';
const labelCls = 'text-[11px] text-gray-500 font-semibold tracking-wider uppercase';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-1 h-4 rounded-full bg-violet-500/70" />
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{children}</h3>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className={`${labelCls} block mb-1.5`}>
        {label}{required && <span className="text-violet-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="border-t border-white/[0.06]" />;
}
