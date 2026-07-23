-- Corrige o split de fontes de tráfego: agora somamos TODAS as fontes retornadas
-- pela Analytics API (não só busca/sugeridos), guardando o restante em "outras"
-- para que os percentuais batam com o total real de views (como no YouTube Studio).
ALTER TABLE video_metrics
  ADD COLUMN IF NOT EXISTS traffic_other_views BIGINT;
