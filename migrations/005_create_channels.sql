-- Canal system: channels + characters tables

CREATE TYPE channel_status AS ENUM ('ativo', 'pausado', 'arquivado');

CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  niche TEXT NOT NULL,
  sub_niche TEXT,
  persona TEXT,
  video_format TEXT,
  language TEXT DEFAULT 'pt',
  status channel_status NOT NULL DEFAULT 'ativo',
  ref_titles TEXT[],
  ref_transcripts JSONB DEFAULT '[]',
  ref_scripts JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE channel_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER channels_updated_at BEFORE UPDATE ON channels FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER characters_updated_at BEFORE UPDATE ON channel_characters FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados gerenciam canais" ON channels FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Usuários autenticados gerenciam personagens" ON channel_characters FOR ALL USING (auth.role() = 'authenticated');
