-- Dashboard Fase 2: tokens OAuth do YouTube Analytics API, por canal.
-- Nunca expostos ao client — usados apenas em Server Actions / rotas de servidor.
CREATE TABLE channel_youtube_auth (
  channel_id UUID PRIMARY KEY REFERENCES channels(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER channel_youtube_auth_updated_at BEFORE UPDATE ON channel_youtube_auth FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE channel_youtube_auth ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários autenticados gerenciam tokens" ON channel_youtube_auth FOR ALL USING (auth.role() = 'authenticated');
