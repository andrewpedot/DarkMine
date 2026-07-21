'use client';

import { useMemo } from 'react';
import type { Channel, ScheduledVideo } from '@/types/database';
import { VideoCard } from './VideoCard';
import { startOfWeek, addDays, toISODate } from '@/lib/dateGrid';

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

export function WeekView({ cursor, channels, videos, onEdit, onAddOnDate, onChanged, onRequestPublish, displaySeq }: Props) {
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

  const weekStart = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayStr = toISODate(new Date());

  return (
    <div className="grid grid-cols-7 divide-x divide-white/5">
      {days.map((day) => {
        const date = toISODate(day);
        const dayVideos = videosByDate.get(date) ?? [];
        const isToday = date === todayStr;
        return (
          <div key={date} className="min-h-[420px] flex flex-col">
            <div
              onClick={() => onAddOnDate(date)}
              className="py-2 px-2 border-b border-white/5 cursor-pointer hover:bg-white/[0.02] transition-colors text-center"
            >
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                {WEEKDAYS[day.getDay()]}
              </div>
              <div className={`text-sm mt-0.5 ${isToday ? 'text-indigo-400 font-bold' : 'text-gray-300'}`}>
                {day.getDate()}
              </div>
            </div>
            <div className="flex-1 p-1.5 flex flex-col gap-1.5">
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
          </div>
        );
      })}
    </div>
  );
}
