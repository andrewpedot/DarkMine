-- Library Items Table for Workflow
-- Saves titles from DarkMine/DarkHook to production pipeline

CREATE TABLE IF NOT EXISTS library_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_en TEXT,
  language TEXT DEFAULT 'en',
  source TEXT CHECK (source IN ('darkmine','darkhook','manual')),
  source_id TEXT,
  source_session_id TEXT,
  vpd NUMERIC,
  anomaly_ratio NUMERIC,
  dark_score INT,
  opportunity_score INT,
  niche_id INT REFERENCES niches(id),
  subniche_id INT REFERENCES niches(id),
  niche_label TEXT,
  audience_profile_id UUID REFERENCES audience_profiles(id),
  persona_name TEXT,
  archetype TEXT,
  status TEXT DEFAULT 'raw' CHECK (status IN ('raw','validated','script','voice_visual','editing','scheduled','pillar')),
  tags JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_library_status ON library_items(status);
CREATE INDEX IF NOT EXISTS idx_library_niche ON library_items(niche_id);
CREATE INDEX IF NOT EXISTS idx_library_source ON library_items(source, source_id);
CREATE INDEX IF NOT EXISTS idx_library_created_by ON library_items(created_by);

ALTER TABLE library_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see own items" ON library_items;
DROP POLICY IF EXISTS "Users can insert own items" ON library_items;
DROP POLICY IF EXISTS "Users can update own items" ON library_items;

CREATE POLICY "Users can see own items" ON library_items
  FOR SELECT USING (created_by = auth.uid() OR created_by IS NULL);
CREATE POLICY "Users can insert own items" ON library_items
  FOR INSERT WITH CHECK (created_by = auth.uid() OR created_by IS NULL);
CREATE POLICY "Users can update own items" ON library_items
  FOR UPDATE USING (created_by = auth.uid() OR created_by IS NULL);