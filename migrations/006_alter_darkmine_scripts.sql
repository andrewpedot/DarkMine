-- Add new copywriting input columns to darkmine_scripts table
ALTER TABLE darkmine_scripts 
ADD COLUMN IF NOT EXISTS publico_alvo TEXT,
ADD COLUMN IF NOT EXISTS nivel_consciencia INT DEFAULT 3,
ADD COLUMN IF NOT EXISTS inimigo_comum TEXT,
ADD COLUMN IF NOT EXISTS emocao_primaria TEXT,
ADD COLUMN IF NOT EXISTS tom_de_voz TEXT,
ADD COLUMN IF NOT EXISTS idioma_narracao TEXT DEFAULT 'Português',
ADD COLUMN IF NOT EXISTS cultura_alvo TEXT DEFAULT 'Brasil',
ADD COLUMN IF NOT EXISTS palavras_por_bloco INT DEFAULT 200,
ADD COLUMN IF NOT EXISTS quantidade_blocos INT DEFAULT 5;
