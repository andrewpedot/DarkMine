'use client';

import { useMemo } from 'react';
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
  const channelById = useMemo(() => {
    const map = new Map<string, Channel>();
    channels.forEach((c) => map.set(c.id, c));
    return map;
  }, [channels]);

  const columns = useMemo(() => {
    const grouped: Record<VideoPipelineStatus, ScheduledVideo[]> = {
      em_producao: [],
      pronto: [],
      publicado: [],
    };
    [...videos]
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
      .forEach((v) => grouped[v.status].push(v));
    return grouped;
  }, [videos]);

  async function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId as VideoPipelineStatus;
    if (newStatus === result.source.droppableId) return;

    if (newStatus === 'publicado') {
      const video = videos.find((v) => v.id === result.draggableId);
      if (video && !video.youtube_video_id) {
        onRequestPublish(video);
        return;
      }
    }

    await updateScheduledVideo(result.draggableId, { status: newStatus });
    onChanged();
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
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
