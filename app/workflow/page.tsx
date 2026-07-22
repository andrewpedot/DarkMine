'use client';

import { useEffect, useState, useCallback } from 'react';
import { listChannels } from '@/app/actions/channels';
import { listScheduledVideos } from '@/app/actions/schedule';
import { AddChannelModal } from '@/components/workflow/AddChannelModal';
import { EditChannelModal } from '@/components/workflow/EditChannelModal';
import { VideoModal } from '@/components/workflow/VideoModal';
import { ScheduleCalendar } from '@/components/workflow/ScheduleCalendar';
import { PublishModal } from '@/components/workflow/PublishModal';
import { STATUS_LABELS } from '@/lib/scheduleStatus';
import { SelectMenu } from '@/components/ui/select-menu';
import type { Channel, ScheduledVideo, VideoPipelineStatus } from '@/types/database';

export default function WorkflowPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [videos, setVideos] = useState<ScheduledVideo[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<'todos' | VideoPipelineStatus>('todos');
  const [loading, setLoading] = useState(true);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [videoModal, setVideoModal] = useState<{ mode: 'add' | 'edit'; video?: ScheduledVideo; date?: string } | null>(null);
  const [publishTarget, setPublishTarget] = useState<ScheduledVideo | null>(null);

  const refresh = useCallback(async () => {
    const [ch, vd] = await Promise.all([listChannels(), listScheduledVideos()]);
    setChannels(ch);
    setVideos(vd);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredVideos = videos
    .filter((v) => selectedChannelId === 'todos' || v.channel_id === selectedChannelId)
    .filter((v) => statusFilter === 'todos' || v.status === statusFilter);
  const activeChannels = selectedChannelId === 'todos' ? channels : channels.filter((c) => c.id === selectedChannelId);

  return (
    <div className="min-h-screen bg-[#080b12] px-6 py-6">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">Workflow</h1>
            <p className="text-sm text-gray-500 mt-1">Cronograma e atividades do seu portfólio de canais</p>
          </div>
          <div className="flex items-center gap-3">
            <SelectMenu
              value={selectedChannelId}
              onChange={setSelectedChannelId}
              options={[
                { value: 'todos', label: 'Todos os canais' },
                ...channels.map((c) => ({ value: c.id, label: c.name, dotColor: c.color })),
              ]}
            />
            <SelectMenu
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as 'todos' | VideoPipelineStatus)}
              options={[
                { value: 'todos', label: 'Todos os status' },
                ...(Object.keys(STATUS_LABELS) as VideoPipelineStatus[]).map((s) => ({
                  value: s,
                  label: STATUS_LABELS[s],
                })),
              ]}
            />
            <button
              onClick={() => setShowAddChannel(true)}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2.5 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Adicionar canal
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-600 text-sm">Carregando...</div>
        ) : channels.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] py-24 flex flex-col items-center justify-center gap-3">
            <p className="text-gray-400 text-sm">Nenhum canal cadastrado ainda.</p>
            <button
              onClick={() => setShowAddChannel(true)}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2.5 transition-colors"
            >
              Adicionar primeiro canal
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {activeChannels.map((c) => {
                const channelVideos = videos.filter((v) => v.channel_id === c.id);
                const publishedCount = channelVideos.filter((v) => v.status === 'publicado').length;
                return (
                <button
                  key={c.id}
                  onClick={() => setEditingChannel(c)}
                  title="Editar canal"
                  className="group flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 rounded-lg border border-white/10 hover:border-white/20 px-2.5 py-1.5 hover:bg-white/5 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.name}
                  <span className="text-gray-600 font-mono">
                    {publishedCount}/{channelVideos.length} publicados
                  </span>
                  <svg
                    className="w-3 h-3 text-gray-500 group-hover:text-gray-300 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                );
              })}
            </div>
            <ScheduleCalendar
              channels={channels}
              videos={filteredVideos}
              onEdit={(v) => setVideoModal({ mode: 'edit', video: v })}
              onAddOnDate={(date) => setVideoModal({ mode: 'add', date })}
              onChanged={refresh}
              onRequestPublish={(v) => setPublishTarget(v)}
            />
          </>
        )}
      </div>

      {showAddChannel && (
        <AddChannelModal
          onClose={() => setShowAddChannel(false)}
          onCreated={() => {
            setShowAddChannel(false);
            refresh();
          }}
        />
      )}

      {editingChannel && (
        <EditChannelModal
          channel={editingChannel}
          onClose={() => setEditingChannel(null)}
          onSaved={() => {
            setEditingChannel(null);
            refresh();
          }}
          onDeleted={() => {
            setEditingChannel(null);
            if (selectedChannelId === editingChannel.id) setSelectedChannelId('todos');
            refresh();
          }}
        />
      )}

      {videoModal && (
        <VideoModal
          channels={channels}
          defaultChannelId={selectedChannelId !== 'todos' ? selectedChannelId : undefined}
          defaultDate={videoModal.date}
          editing={videoModal.mode === 'edit' ? videoModal.video : null}
          onClose={() => setVideoModal(null)}
          onSaved={() => {
            setVideoModal(null);
            refresh();
          }}
        />
      )}

      {publishTarget && (
        <PublishModal
          video={publishTarget}
          onClose={() => setPublishTarget(null)}
          onSaved={() => {
            setPublishTarget(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
