-- Dashboard: métricas adicionais para o "Triângulo de Ouro" (inscritos ganhos e
-- fontes de tráfego), usadas nas taxas de conversão e no diagnóstico por vídeo.
ALTER TABLE video_metrics
  ADD COLUMN IF NOT EXISTS subscribers_gained INT,
  ADD COLUMN IF NOT EXISTS traffic_search_views BIGINT,
  ADD COLUMN IF NOT EXISTS traffic_suggested_views BIGINT;
