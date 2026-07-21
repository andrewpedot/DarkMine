'use client';

import { useState } from 'react';
import { updateScheduledVideo } from '@/app/actions/schedule';
import { extractYouTubeId } from '@/lib/youtubeId';
import type { ScheduledVideo } from '@/types/database';

interface Props {
  video: ScheduledVideo;
  onClose: () => void;
  onSaved: () => void;
}

export function PublishModal({ video, onClose, onSaved }: Props) {
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleConfirm() {
    const id = extractYouTubeId(url);
    if (!id || id.length < 5) return setError('Cole a URL ou o ID do vídeo no YouTube.');
    setSaving(true);
    setError('');
    try {
      await updateScheduledVideo(video.id, {
        status: 'publicado',
        youtube_video_id: id,
        published_at: new Date().toISOString(),
      });
      onSaved();
    } catch (e: any) {
      setError(e.message || 'Erro ao marcar como publicado.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d1117] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div>
            <h2 className="text-lg font-bold text-white">Marcar como publicado</h2>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{video.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-3">
          <p className="text-xs text-gray-500">
            Cole o link do vídeo publicado no YouTube. Isso liga esse vídeo às métricas quando você sincronizar.
          </p>
          <input
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/5 bg-white/[0.02]">
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-200 px-3 py-2">
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 transition-colors"
          >
            {saving ? 'Salvando...' : 'Confirmar publicação'}
          </button>
        </div>
      </div>
    </div>
  );
}
