-- Dashboard Fase 2: cronograma (os 10 vídeos de teste + status de pipeline)
CREATE TYPE video_pipeline_status AS ENUM ('em_producao', 'pronto', 'publicado');

CREATE TABLE scheduled_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  sequence_number INT NOT NULL,        -- Vídeo 1, 2, 3...
  title TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  status video_pipeline_status NOT NULL DEFAULT 'em_producao',
  youtube_video_id TEXT,               -- preenchido ao sincronizar, quando publicado
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_scheduled_videos_channel_seq ON scheduled_videos(channel_id, sequence_number);
CREATE INDEX idx_scheduled_videos_date ON scheduled_videos(scheduled_date);

CREATE TRIGGER scheduled_videos_updated_at BEFORE UPDATE ON scheduled_videos FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE scheduled_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários autenticados gerenciam cronograma" ON scheduled_videos FOR ALL USING (auth.role() = 'authenticated');
