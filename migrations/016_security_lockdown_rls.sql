-- Auditoria de segurança: essas tabelas (do Dark Miner, sem página viva usando-as hoje)
-- estavam com RLS desligado por completo — qualquer um com a anon key pública podia
-- ler/escrever direto via API do Supabase, sem passar pelo login do DarkMine.
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE niches ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_quota ENABLE ROW LEVEL SECURITY;
ALTER TABLE yt_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados gerenciam analysis_results" ON analysis_results FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Usuarios autenticados gerenciam niches" ON niches FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Usuarios autenticados gerenciam videos" ON videos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Usuarios autenticados gerenciam youtube_quota" ON youtube_quota FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Usuarios autenticados gerenciam yt_channels" ON yt_channels FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Usuarios autenticados gerenciam search_sessions" ON search_sessions FOR ALL USING (auth.role() = 'authenticated');

-- "projects" tinha uma policy "Allow all" (qual = true) — acesso público total, sem
-- nenhuma autenticação. Substituída pelo mesmo padrão usado nas demais tabelas.
DROP POLICY IF EXISTS "Allow all" ON projects;
CREATE POLICY "Usuarios autenticados gerenciam projects" ON projects FOR ALL USING (auth.role() = 'authenticated');
