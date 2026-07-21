'use client';

import { useMemo } from 'react';
import type { Channel, ScheduledVideo } from '@/types/database';
import { VideoCard } from './VideoCard';
import { toISODate } from '@/lib/dateGrid';

interface Props {
  cursor: Date;
  channels: Channel[];
  videos: ScheduledVideo[];
  onEdit: (video: ScheduledVideo) => void;
  onAddOnDate: (date: string) => void;
  onChanged: () => void;
  onRequestPublish: (video: ScheduledVideo) => void;
  displaySeq: Map<string, number>;
}

export function DayView({ cursor, channels, videos, onEdit, onAddOnDate, onChanged, onRequestPublish, displaySeq }: Props) {
  const channelById = useMemo(() => {
    const map = new Map<string, Channel>();
    channels.forEach((c) => map.set(c.id, c));
    return map;
  }, [channels]);

  const date = toISODate(cursor);
  const dayVideos = videos
    .filter((v) => v.scheduled_date === date)
    .sort((a, b) => a.channel_id.localeCompare(b.channel_id));

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {dayVideos.length} vídeo{dayVideos.length !== 1 ? 's' : ''} programado{dayVideos.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => onAddOnDate(date)}
          className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Adicionar vídeo neste dia
        </button>
      </div>

      {dayVideos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 py-12 flex items-center justify-center text-sm text-gray-600">
          Nenhum vídeo programado para este dia.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {dayVideos.map((v) => (
            <VideoCard
              key={v.id}
              video={v}
              channel={channelById.get(v.channel_id)}
              displayNumber={displaySeq.get(v.id) ?? v.sequence_number}
              onEdit={() => onEdit(v)}
              onChanged={onChanged}
              onRequestPublish={onRequestPublish}
            />
          ))}
        </div>
      )}
    </div>
  );
}
