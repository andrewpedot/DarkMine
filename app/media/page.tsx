'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { MediaItem } from '../api/media/search/route';

// ─── Source config ────────────────────────────────────────────────────────────
const SOURCE_META = {
  pexels:      { label: 'Pexels',      dot: 'bg-emerald-400', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  pixabay:     { label: 'Pixabay',     dot: 'bg-blue-400',    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  unsplash:    { label: 'Unsplash',    dot: 'bg-gray-400',    badge: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
  youtube_cc:  { label: 'YouTube CC',  dot: 'bg-red-400',     badge: 'bg-red-500/10 text-red-400 border-red-500/20' },
  archive:     { label: 'Archive.org', dot: 'bg-orange-400',  badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
} as const;

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconSearch = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);
const IconPlay = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);
const IconScissors = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
    <line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" />
  </svg>
);
const IconDownload = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);
const IconX = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const IconFilm = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
    <line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" />
    <line x1="2" y1="12" x2="22" y2="12" /><line x1="2" y1="7" x2="7" y2="7" />
    <line x1="2" y1="17" x2="7" y2="17" /><line x1="17" y1="17" x2="22" y2="17" />
    <line x1="17" y1="7" x2="22" y2="7" />
  </svg>
);
const IconCheck = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDuration(sec?: number) {
  if (!sec) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-xl overflow-hidden bg-[#0d1117] border border-white/5 animate-pulse">
      <div className="aspect-video bg-white/5" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-white/5 rounded w-3/4" />
        <div className="h-3 bg-white/5 rounded w-1/2" />
      </div>
    </div>
  );
}

// ─── Media card ───────────────────────────────────────────────────────────────
function MediaCard({
  item,
  isSelected,
  onToggle,
  onPreview,
  onClip,
}: {
  item: MediaItem;
  isSelected: boolean;
  onToggle: (item: MediaItem) => void;
  onPreview: (item: MediaItem) => void;
  onClip: (item: MediaItem) => void;
}) {
  const meta = SOURCE_META[item.source];

  function handleDownload(e: React.MouseEvent) {
    e.stopPropagation();
    window.open(item.downloadUrl, '_blank');
  }

  return (
    <div
      className={`group relative rounded-xl overflow-hidden bg-[#0d1117] border transition-all duration-200 cursor-pointer
        ${isSelected
          ? 'border-indigo-500/60 shadow-[0_0_16px_rgba(99,102,241,0.2)]'
          : 'border-white/5 hover:border-white/15'
        }`}
      onClick={() => onToggle(item)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-black/40">
        {item.thumbnailUrl && (
          <img
            src={item.thumbnailUrl}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}

        {/* Source badge */}
        <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.badge}`}>
          {meta.label}
        </span>

        {/* Duration / type badge */}
        {item.type === 'video' && item.duration && (
          <span className="absolute bottom-2 left-2 text-[10px] font-mono bg-black/70 text-white px-2 py-0.5 rounded">
            {formatDuration(item.duration)}
          </span>
        )}

        {/* Quality badge */}
        {(item.quality === '4K' || item.quality === 'HD') && (
          <span className="absolute bottom-2 right-2 text-[10px] font-mono bg-black/70 text-white px-2 py-0.5 rounded">
            {item.quality}
          </span>
        )}

        {/* Selected overlay */}
        {isSelected && (
          <div className="absolute inset-0 bg-indigo-500/20 flex items-start justify-end p-2">
            <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">
              <IconCheck />
            </div>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onPreview(item); }}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Preview"
          >
            <IconPlay />
          </button>
          {item.source === 'youtube_cc' && (
            <button
              onClick={(e) => { e.stopPropagation(); onClip(item); }}
              className="p-2.5 rounded-full bg-white/10 hover:bg-red-500/30 text-white transition-colors"
              title="Clipar"
            >
              <IconScissors />
            </button>
          )}
          <button
            onClick={handleDownload}
            className="p-2.5 rounded-full bg-white/10 hover:bg-indigo-500/30 text-white transition-colors"
            title="Download"
          >
            <IconDownload />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-xs text-gray-300 font-medium line-clamp-1">{item.title}</p>
        <p className="text-[10px] text-gray-600 mt-0.5 font-mono">{item.author}</p>
      </div>
    </div>
  );
}

// ─── Preview Modal ────────────────────────────────────────────────────────────
function PreviewModal({
  item,
  isSelected,
  onClose,
  onToggle,
}: {
  item: MediaItem;
  isSelected: boolean;
  onClose: () => void;
  onToggle: (item: MediaItem) => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-[#0d1117] border border-white/10 rounded-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${SOURCE_META[item.source].badge}`}>
              {SOURCE_META[item.source].label}
            </span>
            <span className="text-sm text-gray-300 font-medium line-clamp-1">{item.title}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <IconX />
          </button>
        </div>

        {/* Media */}
        <div className="flex-1 overflow-auto">
          {item.source === 'youtube_cc' ? (
            <iframe
              src={`https://www.youtube.com/embed/${item.youtubeId}?autoplay=0`}
              className="w-full aspect-video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : item.source === 'archive' ? (
            <iframe
              src={item.previewUrl}
              className="w-full aspect-video"
              allowFullScreen
            />
          ) : item.type === 'video' && item.previewUrl ? (
            <video
              src={item.previewUrl}
              className="w-full aspect-video object-contain bg-black"
              autoPlay
              muted
              loop
              controls
            />
          ) : (
            <img
              src={item.downloadUrl || item.thumbnailUrl}
              alt={item.title}
              className="w-full max-h-[60vh] object-contain bg-black"
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
          <div className="text-xs text-gray-500">
            <span>{item.author}</span>
            <span className="mx-2 text-gray-700">·</span>
            <span>{item.license}</span>
            {item.quality && <><span className="mx-2 text-gray-700">·</span><span className="font-mono">{item.quality}</span></>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggle(item)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                isSelected
                  ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                  : 'border-white/10 text-gray-300 hover:border-indigo-500/40 hover:text-indigo-300'
              }`}
            >
              {isSelected ? 'Selecionado ✓' : 'Selecionar'}
            </button>
            <button
              onClick={() => window.open(item.downloadUrl, '_blank')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-1.5"
            >
              <IconDownload />
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Clip Editor Modal ────────────────────────────────────────────────────────
function ClipEditor({
  item,
  onClose,
}: {
  item: MediaItem;
  onClose: () => void;
}) {
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(Math.min(30, item.duration || 30));
  const [isClipping, setIsClipping] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const duration = end - start;
  const isValid = duration > 0 && duration <= 60;

  async function handleClip() {
    if (!isValid) return;
    setIsClipping(true);
    setError('');
    try {
      const res = await fetch('/api/media/clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeId: item.youtubeId, startTime: start, endTime: end }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erro ao clipar');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clip_${item.youtubeId}_${start}-${end}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message || 'Erro de rede');
    } finally {
      setIsClipping(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0d1117] border border-white/10 rounded-2xl overflow-hidden max-w-2xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2 text-red-400">
            <IconScissors />
            <span className="text-sm font-bold">Clip Editor</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <IconX />
          </button>
        </div>

        {/* YouTube embed */}
        <iframe
          src={`https://www.youtube.com/embed/${item.youtubeId}?start=${start}&autoplay=0`}
          className="w-full aspect-video"
          allowFullScreen
        />

        {/* Controls */}
        <div className="p-4 space-y-4">
          <p className="text-xs text-gray-500 line-clamp-1">{item.title}</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-1">
                Início (segundos)
              </label>
              <input
                type="number"
                min={0}
                max={item.duration || 9999}
                value={start}
                onChange={(e) => setStart(Math.max(0, Number(e.target.value)))}
                className="input-dark w-full px-3 py-2 rounded-xl text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-1">
                Fim (segundos)
              </label>
              <input
                type="number"
                min={0}
                max={item.duration || 9999}
                value={end}
                onChange={(e) => setEnd(Math.max(0, Number(e.target.value)))}
                className="input-dark w-full px-3 py-2 rounded-xl text-sm font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs font-mono">
              <span className={duration > 60 ? 'text-red-400' : 'text-gray-400'}>
                Duração: {duration}s
              </span>
              {duration > 60 && <span className="text-red-400 ml-2">(máx 60s)</span>}
            </div>
            <div className="flex items-center gap-2">
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Abrir no YouTube ↗
              </a>
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <button
            onClick={handleClip}
            disabled={!isValid || isClipping}
            className="w-full py-3 rounded-xl text-sm font-black text-white bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isClipping ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Extraindo clipe...
              </>
            ) : (
              <>
                <IconScissors />
                Baixar Clipe ({duration}s)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Selection Panel ──────────────────────────────────────────────────────────
function SelectionPanel({
  selected,
  onRemove,
  onClear,
}: {
  selected: MediaItem[];
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function downloadAll() {
    setIsDownloading(true);
    for (const item of selected) {
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          window.open(item.downloadUrl, '_blank');
          resolve();
        }, 400);
      });
    }
    setIsDownloading(false);
  }

  if (selected.length === 0) {
    return (
      <aside className="w-56 flex-shrink-0 bg-[#0d1117] border-l border-white/5 flex flex-col items-center justify-center p-4">
        <div className="text-center text-gray-600">
          <IconFilm />
          <p className="text-xs mt-2">Nenhum item selecionado</p>
          <p className="text-[10px] mt-1">Clique nos cards para selecionar</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-56 flex-shrink-0 bg-[#0d1117] border-l border-white/5 flex flex-col">
      <div className="px-4 py-3 border-b border-white/5">
        <p className="text-xs font-bold text-white">{selected.length} selecionados</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {selected.map((item) => (
          <div key={item.id} className="flex items-center gap-2 group">
            <div className="relative flex-shrink-0 w-12 h-8 rounded overflow-hidden bg-black/40">
              {item.thumbnailUrl && (
                <img
                  src={item.thumbnailUrl}
                  alt={item.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <div className={`absolute bottom-0 left-0 w-1.5 h-1.5 rounded-full ${SOURCE_META[item.source].dot} m-0.5`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-300 line-clamp-2 leading-tight">{item.title}</p>
            </div>
            <button
              onClick={() => onRemove(item.id)}
              className="flex-shrink-0 p-0.5 rounded text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-white/5 space-y-2">
        <button
          onClick={downloadAll}
          disabled={isDownloading}
          className="w-full py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-colors flex items-center justify-center gap-1.5"
        >
          <IconDownload />
          {isDownloading ? 'Baixando...' : 'Baixar todos'}
        </button>
        <button
          onClick={onClear}
          className="w-full py-2 rounded-xl text-xs font-bold border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-colors"
        >
          Limpar seleção
        </button>
      </div>
    </aside>
  );
}

// ─── Source toggle pill ───────────────────────────────────────────────────────
function SourcePill({
  sourceKey,
  active,
  onToggle,
}: {
  sourceKey: keyof typeof SOURCE_META;
  active: boolean;
  onToggle: (k: string) => void;
}) {
  const meta = SOURCE_META[sourceKey];
  return (
    <button
      onClick={() => onToggle(sourceKey)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
        active
          ? meta.badge
          : 'border-white/10 text-gray-600 hover:border-white/20 hover:text-gray-400'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? meta.dot : 'bg-gray-600'}`} />
      {meta.label}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MediaPage() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'video' | 'photo' | 'both'>('both');
  const [sources, setSources] = useState<string[]>(['pexels', 'pixabay', 'unsplash', 'youtube_cc', 'archive']);
  const [orientation, setOrientation] = useState<'landscape' | 'portrait' | 'square'>('landscape');
  const [quality, setQuality] = useState<'4k' | 'hd' | 'all'>('all');
  const [results, setResults] = useState<MediaItem[]>([]);
  const [selected, setSelected] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasSearched, setHasSearched] = useState(false);
  const [missingKeys, setMissingKeys] = useState<string[]>([]);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [clipItem, setClipItem] = useState<MediaItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleSource = useCallback((key: string) => {
    setSources((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  }, []);

  const toggleSelected = useCallback((item: MediaItem) => {
    setSelected((prev) =>
      prev.find((s) => s.id === item.id) ? prev.filter((s) => s.id !== item.id) : [...prev, item]
    );
  }, []);

  const isSelected = useCallback(
    (item: MediaItem) => selected.some((s) => s.id === item.id),
    [selected]
  );

  async function search(nextPage = 1) {
    if (!query.trim() || isLoading) return;
    setIsLoading(true);
    if (nextPage === 1) setResults([]);
    setHasSearched(true);

    try {
      const res = await fetch('/api/media/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, type, sources, orientation, quality, page: nextPage }),
      });
      const data = await res.json();
      if (nextPage === 1) {
        setResults(data.items || []);
      } else {
        setResults((prev) => [...prev, ...(data.items || [])]);
      }
      setMissingKeys(data.missingKeys || []);
      setPage(nextPage);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { setPage(1); search(1); }
  }

  function loadMore() {
    search(page + 1);
  }

  const skeletonCount = 8;

  return (
    <div className="min-h-screen grid-bg flex flex-col" style={{ background: '#080b12' }}>
      {/* Ambient glows */}
      <div className="fixed top-0 left-1/3 w-96 h-96 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div className="fixed bottom-1/4 right-1/4 w-80 h-80 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%)', filter: 'blur(60px)' }} />

      {/* TopBar */}
      <header className="sticky top-0 z-40 border-b border-white/5 flex-shrink-0" style={{ background: 'rgba(8,11,18,0.9)', backdropFilter: 'blur(20px)' }}>
        <div className="pl-20 pr-4 py-3 space-y-3">
          {/* Row 1: title + search */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 16px rgba(99,102,241,0.4)' }}>
                <IconFilm />
              </div>
              <div>
                <span className="text-lg font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400">DarkMídia</span>
                <span className="ml-2 text-[10px] font-mono text-indigo-500/70 uppercase tracking-widest hidden sm:inline">Banco de Mídia</span>
              </div>
            </div>

            <div className="flex-1 relative max-w-2xl">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                <IconSearch />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='Buscar footage... ex: iceland waterfall 4K'
                className="input-dark w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
              />
            </div>

            <button
              onClick={() => { setPage(1); search(1); }}
              disabled={!query.trim() || isLoading}
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors flex items-center gap-2"
            >
              {isLoading && page === 1 ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : <IconSearch />}
              Buscar
            </button>
          </div>

          {/* Row 2: type tabs + source pills + filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Type tabs */}
            <div className="flex items-center rounded-xl bg-white/5 p-0.5 gap-0.5">
              {(['video', 'photo', 'both'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    type === t
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {t === 'video' ? 'Vídeo' : t === 'photo' ? 'Foto' : 'Ambos'}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-white/10" />

            {/* Source pills */}
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(SOURCE_META) as (keyof typeof SOURCE_META)[]).map((k) => (
                <SourcePill key={k} sourceKey={k} active={sources.includes(k)} onToggle={toggleSource} />
              ))}
            </div>

            <div className="h-4 w-px bg-white/10" />

            {/* Orientation */}
            <select
              value={orientation}
              onChange={(e) => setOrientation(e.target.value as any)}
              className="input-dark px-3 py-1.5 rounded-xl text-xs"
            >
              <option value="landscape">Paisagem</option>
              <option value="portrait">Retrato</option>
              <option value="square">Quadrado</option>
            </select>

            {/* Quality */}
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as any)}
              className="input-dark px-3 py-1.5 rounded-xl text-xs"
            >
              <option value="all">Todas qualidades</option>
              <option value="hd">HD+</option>
              <option value="4k">4K</option>
            </select>
          </div>
        </div>
      </header>

      {/* Missing keys warning */}
      {missingKeys.length > 0 && (
        <div className="pl-20 pr-4 pt-3">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2 text-xs text-amber-400">
            Chaves não configuradas no .env.local: <span className="font-mono">{missingKeys.join(', ')}</span>. Configure-as para ver resultados dessas fontes.
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Grid area */}
        <main className="flex-1 overflow-y-auto pl-20 pr-4 py-6">
          {/* Empty state */}
          {!hasSearched && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center py-24">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                  <line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-300 mb-2">Banco de Mídia</h2>
              <p className="text-sm text-gray-600 max-w-sm">
                Busque footage de vídeos e fotos de múltiplas fontes: Pexels, Pixabay, Unsplash, YouTube Creative Commons e Archive.org.
              </p>
            </div>
          )}

          {/* Skeleton */}
          {isLoading && page === 1 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: skeletonCount }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {/* Results */}
          {!isLoading || page > 1 ? (
            <>
              {hasSearched && results.length === 0 && !isLoading && (
                <div className="text-center py-24 text-gray-600">
                  <p className="text-sm">Nenhum resultado encontrado para <span className="text-gray-400">"{query}"</span></p>
                  <p className="text-xs mt-1">Tente outros termos ou ative mais fontes</p>
                </div>
              )}

              {results.length > 0 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {results.map((item) => (
                      <MediaCard
                        key={item.id}
                        item={item}
                        isSelected={isSelected(item)}
                        onToggle={toggleSelected}
                        onPreview={setPreviewItem}
                        onClip={setClipItem}
                      />
                    ))}
                  </div>

                  {/* Load more */}
                  <div className="flex justify-center pb-8">
                    <button
                      onClick={loadMore}
                      disabled={isLoading}
                      className="px-6 py-2.5 rounded-xl text-sm font-semibold border border-white/10 text-gray-400 hover:border-indigo-500/40 hover:text-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Carregando...
                        </>
                      ) : 'Carregar mais'}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </main>

        {/* Selection panel */}
        <SelectionPanel
          selected={selected}
          onRemove={(id) => setSelected((prev) => prev.filter((s) => s.id !== id))}
          onClear={() => setSelected([])}
        />
      </div>

      {/* Preview Modal */}
      {previewItem && (
        <PreviewModal
          item={previewItem}
          isSelected={isSelected(previewItem)}
          onClose={() => setPreviewItem(null)}
          onToggle={toggleSelected}
        />
      )}

      {/* Clip Editor */}
      {clipItem && (
        <ClipEditor
          item={clipItem}
          onClose={() => setClipItem(null)}
        />
      )}
    </div>
  );
}
