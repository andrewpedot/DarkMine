'use client';

import { useState } from 'react';
import type { Channel, ScheduledVideo } from '@/types/database';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { KanbanBoard } from './KanbanBoard';
import { startOfWeek, addDays } from '@/lib/dateGrid';
import { computeDisplaySequence } from '@/lib/displaySequence';

type ViewMode = 'mes' | 'semana' | 'dia' | 'kanban';

const VIEWS: { value: ViewMode; label: string }[] = [
  { value: 'mes', label: 'Mês' },
  { value: 'semana', label: 'Semana' },
  { value: 'dia', label: 'Dia' },
  { value: 'kanban', label: 'Kanban' },
];

interface Props {
  channels: Channel[];
  videos: ScheduledVideo[];
  onEdit: (video: ScheduledVideo) => void;
  onAddOnDate: (date: string) => void;
  onChanged: () => void;
  onRequestPublish: (video: ScheduledVideo) => void;
}

function headerLabel(view: ViewMode, cursor: Date): string {
  if (view === 'mes') {
    return cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }
  if (view === 'semana') {
    const start = startOfWeek(cursor);
    const end = addDays(start, 6);
    const sameMonth = start.getMonth() === end.getMonth();
    const startLabel = start.toLocaleDateString('pt-BR', { day: '2-digit', month: sameMonth ? undefined : 'short' });
    const endLabel = end.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    return `${startLabel} — ${endLabel}`;
  }
  if (view === 'dia') {
    return cursor.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  }
  return 'Cronograma por status';
}

export function ScheduleCalendar({ channels, videos, onEdit, onAddOnDate, onChanged, onRequestPublish }: Props) {
  const [view, setView] = useState<ViewMode>('mes');
  const [cursor, setCursor] = useState(() => new Date());

  const displaySeq = computeDisplaySequence(videos);

  function step(delta: number) {
    if (view === 'mes') {
      setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
    } else if (view === 'semana') {
      setCursor(addDays(cursor, delta * 7));
    } else if (view === 'dia') {
      setCursor(addDays(cursor, delta));
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-wrap gap-3">
        <h3 className="text-sm font-bold text-white capitalize">{headerLabel(view, cursor)}</h3>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1">
            {VIEWS.map((v) => (
              <button
                key={v.value}
                onClick={() => setView(v.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  view === v.value ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {view !== 'kanban' && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => step(-1)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => setCursor(new Date())}
                className="px-3 h-8 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Hoje
              </button>
              <button
                onClick={() => step(1)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {view === 'mes' && (
        <MonthView
          cursor={cursor}
          channels={channels}
          videos={videos}
          onEdit={onEdit}
          onAddOnDate={onAddOnDate}
          onChanged={onChanged}
          onRequestPublish={onRequestPublish}
          displaySeq={displaySeq}
        />
      )}
      {view === 'semana' && (
        <WeekView
          cursor={cursor}
          channels={channels}
          videos={videos}
          onEdit={onEdit}
          onAddOnDate={onAddOnDate}
          onChanged={onChanged}
          onRequestPublish={onRequestPublish}
          displaySeq={displaySeq}
        />
      )}
      {view === 'dia' && (
        <DayView
          cursor={cursor}
          channels={channels}
          videos={videos}
          onEdit={onEdit}
          onAddOnDate={onAddOnDate}
          onChanged={onChanged}
          onRequestPublish={onRequestPublish}
          displaySeq={displaySeq}
        />
      )}
      {view === 'kanban' && (
        <KanbanBoard
          channels={channels}
          videos={videos}
          onEdit={onEdit}
          onChanged={onChanged}
          onRequestPublish={onRequestPublish}
          displaySeq={displaySeq}
        />
      )}
    </div>
  );
}
