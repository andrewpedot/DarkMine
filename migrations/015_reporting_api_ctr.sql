-- Migração para CTR/impressões via YouTube Reporting API (bulk, assíncrono, ~24-48h de atraso).
-- CTR é cumulativo por vídeo (soma de impressões ao longo do tempo + média ponderada de CTR),
-- por isso vive em scheduled_videos e não em video_metrics (que são snapshots pontuais).
ALTER TABLE scheduled_videos
  ADD COLUMN IF NOT EXISTS thumbnail_impressions BIGINT,
  ADD COLUMN IF NOT EXISTS thumbnail_ctr NUMERIC,
  ADD COLUMN IF NOT EXISTS thumbnail_updated_at TIMESTAMPTZ;

ALTER TABLE channel_youtube_auth
  ADD COLUMN IF NOT EXISTS reporting_job_id TEXT,
  ADD COLUMN IF NOT EXISTS reporting_last_report_time TIMESTAMPTZ;
