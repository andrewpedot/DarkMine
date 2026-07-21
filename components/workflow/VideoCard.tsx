'use client';

import type { Channel, ScheduledVideo } from '@/types/database';
import { STATUS_BADGE, STATUS_CARD_BG, STATUS_LABELS, nextStatus } from '@/lib/scheduleStatus';
import { updateScheduledVideo } from '@/app/actions/schedule';

interface Props {
  video: ScheduledVideo;
  channel?: Channel;
  displayNumber: number;
  onEdit: () => void;
  onChanged: () => void;
  onRequestPublish: (video: ScheduledVideo) => void;
  compact?: boolean;
}

export function VideoCard({ video, channel, displayNumber, onEdit, onChanged, onRequestPublish, compact }: Props) {
  async function handleCycle(e: React.MouseEvent) {
    e.stopPropagation();
    const next = nextStatus(video.status);
    if (next === 'publicado' && !video.youtube_video_id) {
      onRequestPublish(video);
      return;
    }
    await updateScheduledVideo(video.id, { status: next });
    onChanged();
  }

  function handleEdit(e: React.MouseEvent) {
    e.stopPropagation();
    onEdit();
  }

  return (
    <div
      onClick={handleEdit}
      className={`rounded-lg transition-colors cursor-pointer flex flex-col gap-1.5 ${STATUS_CARD_BG[video.status]} ${
        compact ? 'px-2 py-1.5' : 'px-2.5 py-2'
      }`}
      style={{ borderLeft: `3px solid ${channel?.color ?? '#8b5cf6'}` }}
    >
      {channel?.name && (
        <span
          className="text-[10px] font-bold uppercase tracking-wide truncate"
          style={{ color: channel.color ?? '#8b5cf6' }}
        >
          {channel.channel_code && <span className="opacity-70">{channel.channel_code} · </span>}
          {channel.name}
        </span>
      )}
      <div className="flex items-center justify-between gap-1">
        <span className={`text-gray-200 leading-snug ${compact ? 'text-xs line-clamp-2' : 'text-xs truncate'}`}>
          <span className="text-gray-500 font-mono font-semibold mr-1">
            {String(displayNumber).padStart(2, '0')}
          </span>
          {video.title}
        </span>
      </div>
      {!compact && (
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] text-gray-600">Vídeo {displayNumber}</span>
          <button
            onClick={handleCycle}
            title="Clique para avançar o status"
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border shrink-0 ${STATUS_BADGE[video.status]}`}
          >
            {STATUS_LABELS[video.status]}
          </button>
        </div>
      )}
      {compact && (
        <button
          onClick={handleCycle}
          title="Clique para avançar o status"
          className={`self-start text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${STATUS_BADGE[video.status]}`}
        >
          {STATUS_LABELS[video.status]}
        </button>
      )}
    </div>
  );
}
