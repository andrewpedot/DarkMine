'use client';

import { useMemo, useState } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import type { Channel, ScheduledVideo, VideoPipelineStatus } from '@/types/database';
import { STATUS_ORDER, STATUS_LABELS } from '@/lib/scheduleStatus';
import { updateScheduledVideo } from '@/app/actions/schedule';
import { VideoCard } from './VideoCard';

const COLUMN_ACCENT: Record<VideoPipelineStatus, string> = {
  em_producao: 'border-amber-500/30',
  pronto: 'border-cyan-500/30',
  publicado: 'border-emerald-500/30',
};

interface Props {
  channels: Channel[];
  videos: ScheduledVideo[];
  onEdit: (video: ScheduledVideo) => void;
  onChanged: () => void;
  onRequestPublish: (video: ScheduledVideo) => void;
  displaySeq: Map<string, number>;
}

export function KanbanBoard({ channels, videos, onEdit, onChanged, onRequestPublish, displaySeq }: Props) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const channelById = useMemo(() => {
    const map = new Map<string, Channel>();
    channels.forEach((c) => map.set(c.id, c));
    return map;
  }, [channels]);

  const dateFilteredVideos = useMemo(() => {
    return videos.filter((v) => {
      if (dateFrom && v.scheduled_date < dateFrom) return false;
      if (dateTo && v.scheduled_date > dateTo) return false;
      return true;
    });
  }, [videos, dateFrom, dateTo]);

  const columns = useMemo(() => {
    const grouped: Record<VideoPipelineStatus, ScheduledVideo[]> = {
      em_producao: [],
      pronto: [],
      publicado: [],
    };
    [...dateFilteredVideos]
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
      .forEach((v) => grouped[v.status].push(v));
    return grouped;
  }, [dateFilteredVideos]);

  async function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId as VideoPipelineStatus;
    if (newStatus === result.source.droppableId) return;

    let publishedAt: string | undefined;
    if (newStatus === 'publicado') {
      const video = videos.find((v) => v.id === result.draggableId);
      if (video && !video.youtube_video_id) {
        onRequestPublish(video);
        return;
      }
      if (video && !video.published_at) publishedAt = new Date().toISOString();
    }

    await updateScheduledVideo(result.draggableId, { status: newStatus, ...(publishedAt ? { published_at: publishedAt } : {}) });
    onChanged();
  }

  const hasDateFilter = dateFrom || dateTo;

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex items-center gap-2 px-5 pt-4">
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Filtrar por data</span>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500/50 [color-scheme:dark]"
        />
        <span className="text-gray-600 text-xs">até</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500/50 [color-scheme:dark]"
        />
        {hasDateFilter && (
          <button
            onClick={() => {
              setDateFrom('');
              setDateTo('');
            }}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Limpar
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-4 p-5">
        {STATUS_ORDER.map((status) => (
          <Droppable key={status} droppableId={status}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`rounded-xl border p-3 min-h-[400px] transition-colors ${COLUMN_ACCENT[status]} ${
                  snapshot.isDraggingOver ? 'bg-white/5' : 'bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wide">{STATUS_LABELS[status]}</h4>
                  <span className="text-[10px] text-gray-600">{columns[status].length}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {columns[status].map((v, index) => (
                    <Draggable key={v.id} draggableId={v.id} index={index}>
                      {(dragProvided, dragSnapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          className={dragSnapshot.isDragging ? 'opacity-80' : ''}
                        >
                          <VideoCard
                            video={v}
                            channel={channelById.get(v.channel_id)}
                            displayNumber={displaySeq.get(v.id) ?? v.sequence_number}
                            onEdit={() => onEdit(v)}
                            onChanged={onChanged}
                            onRequestPublish={onRequestPublish}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}
