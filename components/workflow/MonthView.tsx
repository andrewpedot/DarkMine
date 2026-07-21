'use client';

import { useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import type { Channel, ScheduledVideo } from '@/types/database';
import { updateScheduledVideo } from '@/app/actions/schedule';
import { VideoCard } from './VideoCard';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

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

export function MonthView({ cursor, channels, videos, onEdit, onAddOnDate, onChanged, onRequestPublish, displaySeq }: Props) {
  const channelById = useMemo(() => {
    const map = new Map<string, Channel>();
    channels.forEach((c) => map.set(c.id, c));
    return map;
  }, [channels]);

  const videosByDate = useMemo(() => {
    const map = new Map<string, ScheduledVideo[]>();
    videos.forEach((v) => {
      const list = map.get(v.scheduled_date) ?? [];
      list.push(v);
      map.set(v.scheduled_date, list);
    });
    return map;
  }, [videos]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay();

  const cells: (string | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  async function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const newDate = result.destination.droppableId;
    if (newDate === result.source.droppableId) return;
    await updateScheduledVideo(result.draggableId, { scheduled_date: newDate });
    onChanged();
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-7 border-b border-white/5">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-2 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((date, i) => {
          if (!date) return <div key={i} className="min-h-[150px] border-b border-r border-white/5" />;
          const dayVideos = videosByDate.get(date) ?? [];
          const isToday = date === todayStr;
          return (
            <Droppable key={date} droppableId={date}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  onClick={() => onAddOnDate(date)}
                  className={`min-h-[150px] border-b border-r border-white/5 p-2 group cursor-pointer transition-colors ${
                    snapshot.isDraggingOver ? 'bg-indigo-500/[0.06]' : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center justify-between px-0.5">
                    <span className={`text-xs ${isToday ? 'text-indigo-400 font-bold' : 'text-gray-500'}`}>
                      {parseInt(date.slice(-2), 10)}
                    </span>
                    <svg
                      className="w-3.5 h-3.5 text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div className="mt-1 flex flex-col gap-1">
                    {dayVideos.slice(0, 3).map((v, index) => (
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
                              compact
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {dayVideos.length > 3 && (
                      <span className="text-[10px] text-gray-600 px-1.5">+{dayVideos.length - 3} mais</span>
                    )}
                  </div>
                </div>
              )}
            </Droppable>
          );
        })}
      </div>
    </DragDropContext>
  );
}
