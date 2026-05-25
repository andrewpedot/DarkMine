-- 1. Create the darkmine_scripts table if it doesn't exist
CREATE TABLE IF NOT EXISTS darkmine_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  nicho TEXT DEFAULT '',
  subnicho TEXT DEFAULT '',
  contexto TEXT DEFAULT '',
  wordcount INT DEFAULT 3000,
  conteudo JSONB DEFAULT '{}'::jsonb,
  conteudo_raw TEXT DEFAULT '',
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add new copywriting columns (for cases where table already exists but lacks them)
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
