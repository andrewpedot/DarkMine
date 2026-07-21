'use client';

import { useState } from 'react';
import { addScheduledVideo, updateScheduledVideo, deleteScheduledVideo } from '@/app/actions/schedule';
import { extractYouTubeId } from '@/lib/youtubeId';
import type { Channel, ScheduledVideo } from '@/types/database';

interface Props {
  channels: Channel[];
  defaultChannelId?: string;
  defaultDate?: string;
  editing?: ScheduledVideo | null;
  onClose: () => void;
  onSaved: () => void;
}

export function VideoModal({ channels, defaultChannelId, defaultDate, editing, onClose, onSaved }: Props) {
  const [channelId, setChannelId] = useState(editing?.channel_id ?? defaultChannelId ?? channels[0]?.id ?? '');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [date, setDate] = useState(editing?.scheduled_date ?? defaultDate ?? new Date().toISOString().slice(0, 10));
  const [youtubeUrl, setYoutubeUrl] = useState(editing?.youtube_video_id ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function handleDelete() {
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      await deleteScheduledVideo(editing.id);
      onSaved();
    } catch (e: any) {
      setError(e.message || 'Erro ao excluir vídeo.');
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!title.trim()) return setError('Dê um título ao vídeo.');
    if (!channelId) return setError('Selecione um canal.');
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await updateScheduledVideo(editing.id, {
          title: title.trim(),
          scheduled_date: date,
          youtube_video_id: youtubeUrl.trim() ? extractYouTubeId(youtubeUrl) : undefined,
        });
      } else {
        await addScheduledVideo({ channel_id: channelId, title: title.trim(), scheduled_date: date });
      }
      onSaved();
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar vídeo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d1117] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <h2 className="text-lg font-bold text-white">{editing ? 'Editar vídeo' : 'Adicionar vídeo'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          {!editing && (
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Canal</label>
              <select
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                className="mt-1.5 w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
              >
                {channels.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#0d1117]">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Título</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Data</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1.5 w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 [color-scheme:dark]"
            />
          </div>

          {editing && (
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">URL do YouTube (opcional)</label>
              <input
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="mt-1.5 w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-white/[0.02]">
          {editing ? (
            confirmingDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-300">Excluir este vídeo?</span>
                <button onClick={() => setConfirmingDelete(false)} className="text-xs text-gray-400 hover:text-gray-200">
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="text-xs font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg px-3 py-1.5"
                >
                  Excluir
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="text-xs text-red-400/70 hover:text-red-400 transition-colors"
              >
                Excluir vídeo
              </button>
            )
          ) : (
            <span />
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 transition-colors"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
