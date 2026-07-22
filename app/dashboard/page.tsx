'use client';

import { useEffect, useState, useCallback } from 'react';
import { listChannels } from '@/app/actions/channels';
import { listScheduledVideos } from '@/app/actions/schedule';
import { getChannelAuthStatus, disconnectChannel } from '@/app/actions/youtube-auth';
import { listLatestMetricsByChannel } from '@/app/actions/metrics';
import { syncChannelMetrics } from '@/app/actions/youtube-sync';
import { StatTile } from '@/components/dashboard/StatTile';
import { SelectMenu } from '@/components/ui/select-menu';
import type { Channel, ScheduledVideo, VideoMetric } from '@/types/database';

function formatPct(n: number | null): string {
  return n === null ? '—' : `${n.toFixed(1)}%`;
}

function formatNumber(n: number | null): string {
  return n === null ? '—' : n.toLocaleString('pt-BR');
}

export default function DashboardPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [connected, setConnected] = useState(false);
  const [publishedVideos, setPublishedVideos] = useState<ScheduledVideo[]>([]);
  const [metrics, setMetrics] = useState<VideoMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [syncMessage, setSyncMessage] = useState('');

  useEffect(() => {
    listChannels().then((ch) => {
      setChannels(ch);
      if (ch.length > 0) setSelectedChannelId(ch[0].id);
      setLoading(false);
    });
  }, []);

  const loadChannelData = useCallback(async (channelId: string) => {
    const [isConnected, videos, latestMetrics] = await Promise.all([
      getChannelAuthStatus(channelId),
      listScheduledVideos(channelId),
      listLatestMetricsByChannel(channelId),
    ]);
    setConnected(isConnected);
    setPublishedVideos(videos.filter((v) => v.status === 'publicado'));
    setMetrics(latestMetrics);
  }, []);

  useEffect(() => {
    if (selectedChannelId) loadChannelData(selectedChannelId);
  }, [selectedChannelId, loadChannelData]);

  const selectedChannel = channels.find((c) => c.id === selectedChannelId);

  const videoById = new Map(publishedVideos.map((v) => [v.id, v]));
  const ranked = metrics
    .map((m) => ({ metric: m, video: videoById.get(m.scheduled_video_id) }))
    .filter((r) => r.video && r.metric.ctr != null)
    .sort((a, b) => (b.metric.ctr ?? 0) - (a.metric.ctr ?? 0));

  const avgCtr = metrics.length
    ? metrics.reduce((sum, m) => sum + (m.ctr ?? 0), 0) / metrics.filter((m) => m.ctr != null).length || null
    : null;
  const avgViews = metrics.length
    ? Math.round(metrics.reduce((sum, m) => sum + (m.views ?? 0), 0) / metrics.length)
    : null;
  const avgRetention = metrics.length
    ? metrics.reduce((sum, m) => sum + (m.avg_view_duration_sec ?? 0), 0) / metrics.filter((m) => m.avg_view_duration_sec != null).length || null
    : null;

  async function handleDisconnect() {
    if (!selectedChannelId) return;
    await disconnectChannel(selectedChannelId);
    loadChannelData(selectedChannelId);
  }

  async function handleSync() {
    if (!selectedChannelId) return;
    setSyncing(true);
    setSyncError('');
    setSyncMessage('');
    try {
      const result = await syncChannelMetrics(selectedChannelId);
      setSyncMessage(
        result.synced > 0
          ? `Sincronizado: ${result.synced} vídeo${result.synced !== 1 ? 's' : ''} atualizado${result.synced !== 1 ? 's' : ''}.`
          : 'Nenhum vídeo publicado com URL do YouTube para sincronizar.'
      );
      await loadChannelData(selectedChannelId);
    } catch (e: any) {
      setSyncError(e.message || 'Erro ao sincronizar com o YouTube.');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#080b12] px-8 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Métricas e insights de performance por canal</p>
          </div>
          <div className="flex items-center gap-3">
            <SelectMenu
              value={selectedChannelId}
              onChange={setSelectedChannelId}
              options={channels.map((c) => ({ value: c.id, label: c.name, dotColor: c.color }))}
            />

            {connected ? (
              <>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 transition-colors flex items-center gap-2"
                >
                  <svg
                    className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {syncing ? 'Sincronizando...' : 'Sincronizar com YouTube'}
                </button>
                <button
                  onClick={handleDisconnect}
                  className="text-xs text-gray-600 hover:text-red-400 transition-colors px-2"
                >
                  Desconectar
                </button>
              </>
            ) : (
              <a
                href={selectedChannelId ? `/api/auth/youtube?channelId=${selectedChannelId}` : '#'}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2.5 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Conectar ao YouTube
              </a>
            )}
          </div>
        </div>

        {(syncMessage || syncError) && (
          <div className={`mb-4 text-sm ${syncError ? 'text-red-400' : 'text-emerald-400'}`}>
            {syncError || syncMessage}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-600 text-sm">Carregando...</div>
        ) : channels.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] py-24 flex flex-col items-center justify-center gap-2 text-center px-6">
            <p className="text-gray-400 text-sm">Nenhum canal cadastrado ainda.</p>
            <p className="text-gray-600 text-xs">Adicione um canal na aba Workflow para começar a acompanhar métricas.</p>
          </div>
        ) : !connected ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] py-24 flex flex-col items-center justify-center gap-2 text-center px-6">
            <p className="text-gray-400 text-sm">{selectedChannel?.name} ainda não está conectado ao YouTube Analytics.</p>
            <p className="text-gray-600 text-xs max-w-md">
              Clique em "Conectar ao YouTube" para autorizar o acesso aos dados privados desse canal — CTR, views,
              retenção e a análise de títulos aparecem aqui depois da primeira sincronização.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-3 gap-4">
              <StatTile label="CTR médio" value={formatPct(avgCtr)} hint={`${publishedVideos.length} vídeos publicados`} />
              <StatTile label="Views médias" value={formatNumber(avgViews)} hint="por vídeo, última sincronização" />
              <StatTile
                label="Retenção média"
                value={avgRetention ? `${Math.round(avgRetention / 60)}min` : '—'}
                hint="duração média assistida"
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5">
                <h3 className="text-sm font-bold text-white">Evolução do CTR</h3>
              </div>
              <div className="p-8 flex items-center justify-center text-sm text-gray-600">
                {metrics.length === 0
                  ? 'Sem sincronizações ainda — clique em "Sincronizar com YouTube" para começar a coletar dados.'
                  : 'Gráfico de tendência será exibido aqui após múltiplas sincronizações.'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5">
                  <h3 className="text-sm font-bold text-emerald-400">Top 3 títulos por CTR</h3>
                </div>
                <div className="p-4 flex flex-col gap-2">
                  {ranked.slice(0, 3).length === 0 ? (
                    <p className="text-xs text-gray-600 py-4 text-center">Ainda sem dados suficientes.</p>
                  ) : (
                    ranked.slice(0, 3).map((r) => (
                      <div key={r.metric.id} className="flex items-center justify-between text-xs gap-2">
                        <span className="text-gray-300 truncate">{r.video?.title}</span>
                        <span className="text-emerald-400 font-mono shrink-0">{formatPct(r.metric.ctr ?? null)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5">
                  <h3 className="text-sm font-bold text-red-400">Bottom 3 títulos por CTR</h3>
                </div>
                <div className="p-4 flex flex-col gap-2">
                  {ranked.slice(-3).length === 0 ? (
                    <p className="text-xs text-gray-600 py-4 text-center">Ainda sem dados suficientes.</p>
                  ) : (
                    [...ranked.slice(-3)].reverse().map((r) => (
                      <div key={r.metric.id} className="flex items-center justify-between text-xs gap-2">
                        <span className="text-gray-300 truncate">{r.video?.title}</span>
                        <span className="text-red-400 font-mono shrink-0">{formatPct(r.metric.ctr ?? null)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5">
                <h3 className="text-sm font-bold text-white">Vídeos publicados</h3>
              </div>
              {publishedVideos.length === 0 ? (
                <div className="p-8 flex items-center justify-center text-sm text-gray-600">
                  Nenhum vídeo publicado ainda para este canal.
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-white/5">
                      <th className="px-5 py-2 font-medium">Título</th>
                      <th className="px-5 py-2 font-medium">Publicado em</th>
                      <th className="px-5 py-2 font-medium text-right">Views</th>
                      <th className="px-5 py-2 font-medium text-right">CTR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {publishedVideos.map((v) => {
                      const m = metrics.find((met) => met.scheduled_video_id === v.id);
                      return (
                        <tr key={v.id} className="border-b border-white/5 text-gray-300">
                          <td className="px-5 py-2.5 truncate max-w-xs">{v.title}</td>
                          <td className="px-5 py-2.5 text-gray-500">
                            {v.published_at ? new Date(v.published_at).toLocaleDateString('pt-BR') : '—'}
                          </td>
                          <td className="px-5 py-2.5 text-right font-mono">{formatNumber(m?.views ?? null)}</td>
                          <td className="px-5 py-2.5 text-right font-mono">{formatPct(m?.ctr ?? null)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
