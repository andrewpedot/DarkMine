-- Dashboard Fase 2: campos de gestão de canal (modal "Adicionar Canal")
ALTER TABLE channels
  ADD COLUMN IF NOT EXISTS youtube_url TEXT,
  ADD COLUMN IF NOT EXISTS tipo TEXT CHECK (tipo IN ('financas', 'storytelling', 'outro')),
  ADD COLUMN IF NOT EXISTS recurrence_type TEXT CHECK (recurrence_type IN ('diario', 'seg_sex', 'dia_sim_dia_nao', 'custom')),
  ADD COLUMN IF NOT EXISTS recurrence_days SMALLINT[], -- só usado quando recurrence_type = 'custom'; 0=domingo..6=sábado
  ADD COLUMN IF NOT EXISTS publish_start_date DATE,
  ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#8b5cf6'; -- identificação no calendário
