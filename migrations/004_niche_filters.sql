-- Add niche filter columns to search_sessions
ALTER TABLE search_sessions 
ADD COLUMN IF NOT EXISTS niche_filter_id INT REFERENCES niches(id),
ADD COLUMN IF NOT EXISTS subniche_filter_id INT REFERENCES niches(id);

CREATE INDEX IF NOT EXISTS idx_search_sessions_niche ON search_sessions(niche_filter_id);
CREATE INDEX IF NOT EXISTS idx_search_sessions_subniche ON search_sessions(subniche_filter_id);