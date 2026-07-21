-- Dashboard Fase 2: histórico de sincronizações do YouTube Analytics
-- Append-only: uma linha por clique em "Sincronizar com YouTube", permite montar a
-- linha de tendência de CTR e marcar os snapshots D1/D7/D30.
CREATE TABLE video_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_video_id UUID NOT NULL REFERENCES scheduled_videos(id) ON DELETE CASCADE,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  days_since_published INT,   -- idade do vídeo nesse sync (identifica o snapshot D1/D7/D30)
  views BIGINT,
  ctr NUMERIC(5,2),
  watch_time_minutes NUMERIC,
  avg_view_duration_sec INT,
  likes INT,
  comments INT,
  impressions BIGINT
);

CREATE INDEX idx_video_metrics_video ON video_metrics(scheduled_video_id);
CREATE INDEX idx_video_metrics_synced ON video_metrics(synced_at DESC);

ALTER TABLE video_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários autenticados gerenciam métricas" ON video_metrics FOR ALL USING (auth.role() = 'authenticated');
