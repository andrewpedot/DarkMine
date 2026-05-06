-- DarkMine Database Migration
-- Creates all tables for the Opportunity Research module

-- 1. NICHES TABLE
CREATE TABLE IF NOT EXISTS niches (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id INTEGER REFERENCES niches(id),
  cpm_tier INTEGER CHECK (cpm_tier BETWEEN 1 AND 5),
  is_entertainment BOOLEAN DEFAULT false,
  keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. SEARCH SESSIONS TABLE
CREATE TABLE IF NOT EXISTS search_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  search_type TEXT CHECK (search_type IN ('money', 'entertainment', 'mixed')),
  keywords TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  max_subscribers INTEGER DEFAULT 50000,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. VIDEOS TABLE
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  channel_name TEXT,
  published_at TIMESTAMP,
  duration_sec INTEGER,
  views BIGINT DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  thumbnail_url TEXT,
  description TEXT,
  tags JSONB DEFAULT '[]',
  contains_synthetic_media BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. CHANNELS TABLE
CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at_youtube TIMESTAMP,
  subscriber_count BIGINT DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  total_videos INTEGER DEFAULT 0,
  country TEXT,
  banner_url TEXT,
  description TEXT,
  last_fetched TIMESTAMP DEFAULT NOW()
);

-- 5. ANALYSIS RESULTS TABLE
CREATE TABLE IF NOT EXISTS analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES search_sessions(id) ON DELETE CASCADE,
  video_id TEXT REFERENCES videos(id),
  channel_id TEXT REFERENCES channels(id),
  niche_id INTEGER REFERENCES niches(id),
  subniche_id INTEGER REFERENCES niches(id),
  faceless_score INTEGER CHECK (faceless_score BETWEEN 0 AND 100),
  comment_gold_score INTEGER CHECK (comment_gold_score BETWEEN 0 AND 100),
  opportunity_score INTEGER CHECK (opportunity_score BETWEEN 0 AND 100),
  score_breakdown JSONB,
  search_type TEXT,
  outlier_multiplier NUMERIC,
  views_per_day INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. YOUTUBE QUOTA TRACKING TABLE
CREATE TABLE IF NOT EXISTS youtube_quota (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  units_used INTEGER DEFAULT 0,
  units_limit INTEGER DEFAULT 10000,
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(date)
);

-- 7. PROJECTS TABLE (for saved titles)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_title TEXT NOT NULL,
  generated_title TEXT,
  market TEXT,
  channel_name TEXT,
  channel_url TEXT,
  status TEXT DEFAULT 'pending',
  search_session_id UUID REFERENCES search_sessions(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_analysis_session ON analysis_results(session_id);
CREATE INDEX IF NOT EXISTS idx_analysis_score ON analysis_results(opportunity_score DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_channel ON analysis_results(channel_id);
CREATE INDEX IF NOT EXISTS idx_videos_channel ON videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_channels_name ON channels(name);
CREATE INDEX IF NOT EXISTS idx_search_sessions_status ON search_sessions(status);
CREATE INDEX IF NOT EXISTS idx_search_sessions_created ON search_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_session ON projects(search_session_id);

-- SEED DATA FOR NICHES
INSERT INTO niches (name, parent_id, cpm_tier, is_entertainment, keywords) VALUES
-- Root level niches
('Finanças', NULL, 5, false, ARRAY['finance', 'investing', 'money', 'stocks', 'crypto', 'bitcoin', 'trading']),
('True Crime', NULL, 4, false, ARRAY['true crime', 'murder', 'mystery', 'unsolved', 'investigation']),
('Tech', NULL, 5, false, ARRAY['technology', 'ai', 'artificial intelligence', 'software', 'coding']),
('História', NULL, 3, false, ARRAY['history', 'historical', 'documentary', 'war', 'ancient']),
('Psicologia', NULL, 4, false, ARRAY['psychology', 'mental health', 'mind', 'behavior', 'therapy']),
('Geopolítica', NULL, 4, false, ARRAY['geopolitics', 'politics', 'world affairs', 'economy', 'war']),
('Estoicismo', NULL, 3, false, ARRAY['stoicism', 'philosophy', 'wisdom', 'life lessons']),
('Espaço/Ciência', NULL, 4, false, ARRAY['space', 'science', 'universe', 'astronomy', 'nasa']),
('Entretenimento', NULL, 3, true, ARRAY['entertainment', 'movie', 'gaming', 'music', 'celebrity'])
ON CONFLICT (id) DO NOTHING;

-- Sub-niches for Finanças
INSERT INTO niches (name, parent_id, cpm_tier, is_entertainment, keywords)
SELECT 'Investimentos', id, 5, false, ARRAY['investment', 'stocks', 'bonds', 'portfolio'], id FROM niches WHERE name = 'Finanças'
ON CONFLICT (id) DO NOTHING;

INSERT INTO niches (name, parent_id, cpm_tier, is_entertainment, keywords)
SELECT 'Criptomoedas', id, 5, false, ARRAY['crypto', 'bitcoin', 'ethereum', 'blockchain'], id FROM niches WHERE name = 'Finanças'
ON CONFLICT (id) DO NOTHING;

INSERT INTO niches (name, parent_id, cpm_tier, is_entertainment, keywords)
SELECT 'Finanças Pessoais', id, 4, false, ARRAY['personal finance', 'budgeting', 'saving', 'money tips'], id FROM niches WHERE name = 'Finanças'
ON CONFLICT (id) DO NOTHING;

-- Sub-niches for Tech
INSERT INTO niches (name, parent_id, cpm_tier, is_entertainment, keywords)
SELECT 'IA & Machine Learning', id, 5, false, ARRAY['ai', 'machine learning', 'chatgpt', 'neural network'], id FROM niches WHERE name = 'Tech'
ON CONFLICT (id) DO NOTHING;

INSERT INTO niches (name, parent_id, cpm_tier, is_entertainment, keywords)
SELECT 'Cybersecurity', id, 4, false, ARRAY['cybersecurity', 'hacking', 'privacy', 'security'], id FROM niches WHERE name = 'Tech'
ON CONFLICT (id) DO NOTHING;

-- Sub-niches for True Crime
INSERT INTO niches (name, parent_id, cpm_tier, is_entertainment, keywords)
SELECT 'Casos Frios', id, 5, false, ARRAY['cold case', 'unsolved murder', 'missing person'], id FROM niches WHERE name = 'True Crime'
ON CONFLICT (id) DO NOTHING;

INSERT INTO niches (name, parent_id, cpm_tier, is_entertainment, keywords)
SELECT 'Investigações', id, 4, false, ARRAY['investigation', 'exposed', 'cover up', 'scandal'], id FROM niches WHERE name = 'True Crime'
ON CONFLICT (id) DO NOTHING;

-- Sub-niches for Psicologia  
INSERT INTO niches (name, parent_id, cpm_tier, is_entertainment, keywords)
SELECT 'Psicologia Social', id, 4, false, ARRAY['social psychology', 'manipulation', 'influence', 'persuasion'], id FROM niches WHERE name = 'Psicologia'
ON CONFLICT (id) DO NOTHING;

INSERT INTO niches (name, parent_id, cpm_tier, is_entertainment, keywords)
SELECT 'Autoconhecimento', id, 3, false, ARRAY['self improvement', 'personal growth', 'motivation'], id FROM niches WHERE name = 'Psicologia'
ON CONFLICT (id) DO NOTHING;

-- Sub-niches for Espaço/Ciência
INSERT INTO niches (name, parent_id, cpm_tier, is_entertainment, keywords)
SELECT 'Astronomia', id, 4, false, ARRAY['astronomy', 'stars', 'planets', 'galaxy'], id FROM niches WHERE name = 'Espaço/Ciência'
ON CONFLICT (id) DO NOTHING;

INSERT INTO niches (name, parent_id, cpm_tier, is_entertainment, keywords)
SELECT 'Fenômenos Misteriosos', id, 5, false, ARRAY['mystery', 'unexplained', 'phenomenon', 'ufo'], id FROM niches WHERE name = 'Espaço/Ciência'
ON CONFLICT (id) DO NOTHING;

-- Initialize quota tracking
INSERT INTO youtube_quota (date, units_used, units_limit)
VALUES (CURRENT_DATE, 0, 10000)
ON CONFLICT (date) DO NOTHING;