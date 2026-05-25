# Tarefa: Construir página "Banco de Mídia" no DarkMine

## Contexto do projeto

DarkMine é uma aplicação Next.js 16 + React 19 + TypeScript + Tailwind CSS com sidebar colapsável. Usa Supabase para dados e já tem a YouTube Data API v3 integrada. O estilo visual é dark (fundo `#080b12`), com acentos em indigo/roxo. Veja `app/thumbnail/page.tsx` e `app/darkmine/page.tsx` como referência de padrão visual e estrutura.

**Variáveis de ambiente já existentes (`.env.local`):**
```
NEXT_PUBLIC_YOUTUBE_API_KEY=AIzaSyBLxTZr2M0x_1ZBn59RpE8o_spoWkGm-HA
ANTHROPIC_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

**Precisa adicionar ao `.env.local`:**
```
PEXELS_API_KEY=      # usuário vai preencher - https://www.pexels.com/api/
PIXABAY_API_KEY=     # usuário vai preencher - https://pixabay.com/api/docs/
UNSPLASH_ACCESS_KEY= # usuário vai preencher - https://unsplash.com/developers
```

---

## O que construir

Uma página de **Banco de Mídia** em `/media` que permite ao editor de vídeo buscar, visualizar, selecionar e baixar footage (vídeos e imagens) de múltiplas fontes, tudo dentro do DarkMine.

---

## Arquivos a criar/modificar

### 1. Sidebar — adicionar item de menu
**Arquivo:** `components/Sidebar.tsx`

Adicionar novo item no array `menuItems` (após DarkScript):
```ts
{
  name: 'DarkMídia',
  path: '/media',
  icon: /* ícone de filme/câmera em SVG — estilo outline, mesmo padrão dos outros */
}
```

---

### 2. API Route — busca multi-fonte
**Arquivo:** `app/api/media/search/route.ts`

Endpoint `POST` que recebe:
```ts
{
  query: string,          // termo de busca ex: "iceland waterfall aerial"
  type: 'video' | 'photo' | 'both',
  sources: string[],      // ['pexels', 'pixabay', 'unsplash', 'youtube_cc', 'archive']
  orientation?: 'landscape' | 'portrait' | 'square',
  quality?: '4k' | 'hd' | 'all',
  page?: number
}
```

Retorna array normalizado de resultados:
```ts
interface MediaItem {
  id: string
  source: 'pexels' | 'pixabay' | 'unsplash' | 'youtube_cc' | 'archive'
  type: 'video' | 'photo'
  title: string
  thumbnailUrl: string
  previewUrl?: string       // URL do vídeo para preview (baixa resolução)
  downloadUrl: string       // URL direta de download
  width: number
  height: number
  duration?: number         // segundos (só vídeos)
  author: string
  license: string           // ex: 'Pexels License', 'CC BY', 'Pixabay License'
  sourceUrl: string         // link para origem
  quality: string           // '4K', 'HD', etc.
  // para YouTube CC:
  youtubeId?: string        // ID do vídeo no YouTube
}
```

**Implementar busca em cada fonte:**

#### Pexels
- Videos: `GET https://api.pexels.com/videos/search?query={q}&per_page=20&page={page}&orientation={orientation}`
- Photos: `GET https://api.pexels.com/v1/search?query={q}&per_page=20&page={page}&orientation={orientation}`
- Header: `Authorization: {PEXELS_API_KEY}`
- Download URL de vídeo: pegar o arquivo com quality mais alta do array `video_files`
- Normalizar para `MediaItem`

#### Pixabay
- Videos: `GET https://pixabay.com/api/videos/?key={KEY}&q={q}&per_page=20&page={page}&video_type=all`
- Photos: `GET https://pixabay.com/api/?key={KEY}&q={q}&per_page=20&page={page}&image_type=photo`
- Download URL de vídeo: pegar `videos.large.url` (maior disponível)
- Normalizar para `MediaItem`

#### Unsplash (somente fotos)
- `GET https://api.unsplash.com/search/photos?query={q}&per_page=20&page={page}`
- Header: `Authorization: Client-ID {UNSPLASH_ACCESS_KEY}`
- Download URL: `urls.raw` ou `urls.full`
- Normalizar para `MediaItem`

#### YouTube Creative Commons
- Usar `NEXT_PUBLIC_YOUTUBE_API_KEY` já disponível
- `GET https://www.googleapis.com/youtube/v3/search?part=snippet&q={q}&type=video&videoLicense=creativeCommon&maxResults=20&key={KEY}`
- Em seguida buscar detalhes: `GET https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id={ids}&key={KEY}`
- Normalizar para `MediaItem` com `youtubeId` preenchido
- `downloadUrl` = URL do vídeo no YouTube (será usado pelo endpoint de clipping)
- Licença: `'Creative Commons (CC BY)'`

#### Archive.org (Tier 3)
- `GET https://archive.org/advancedsearch.php?q={q}+AND+mediatype:(movies)&fl[]=identifier,title,description,subject&rows=20&output=json`
- Para cada item, thumbnail: `https://archive.org/services/img/{identifier}`
- Download: `https://archive.org/download/{identifier}`
- Buscar também em `NASA` com query `site:archive.org nasa` ou filtrar por `subject:nasa`
- Licença: `'Public Domain'`

**Buscar todas as fontes em paralelo** usando `Promise.allSettled()` e combinar resultados. Se uma fonte falhar (API key não configurada, etc.), retornar os resultados das outras sem quebrar.

---

### 3. API Route — clipping de vídeo YouTube
**Arquivo:** `app/api/media/clip/route.ts`

Endpoint `POST` que recebe:
```ts
{
  youtubeId: string,
  startTime: number,   // segundos
  endTime: number,     // segundos (máx 60s de diferença)
  quality?: 'best' | '720' | '480'
}
```

Implementação:
1. Validar que `endTime - startTime <= 60` (máximo 60 segundos por clipe)
2. Montar o comando yt-dlp:
```bash
yt-dlp "https://www.youtube.com/watch?v={youtubeId}" \
  --download-sections "*{startTime}-{endTime}" \
  -f "bestvideo[height<=720]+bestaudio/best[height<=720]" \
  --merge-output-format mp4 \
  -o "/tmp/clip_{youtubeId}_{startTime}_{endTime}.mp4"
```
3. Executar via Node.js `child_process.spawn` ou `exec`
4. Verificar se yt-dlp está instalado — se não, retornar erro claro: `{ error: 'yt-dlp não instalado. Execute: pip install yt-dlp' }`
5. Verificar se ffmpeg está instalado (já está disponível no servidor)
6. Após download, ler o arquivo e fazer stream como response com header `Content-Disposition: attachment; filename="clip.mp4"`
7. Deletar arquivo temporário após enviar
8. Timeout de 60 segundos para o processo

**Nota:** yt-dlp precisa ser instalado no servidor Netlify/produção. Adicionar ao README as instruções. No ambiente local: `pip install yt-dlp`.

---

### 4. Página principal
**Arquivo:** `app/media/page.tsx`

Componente client-side (`'use client'`). Interface completa com:

#### Layout
```
[Sidebar] | [TopBar: título + barra de busca + filtros] 
          | [Grid de resultados] | [Painel lateral de selecionados]
```

#### Estado da página
```ts
const [query, setQuery] = useState('')
const [type, setType] = useState<'video' | 'photo' | 'both'>('both')
const [sources, setSources] = useState(['pexels', 'pixabay', 'unsplash', 'youtube_cc', 'archive'])
const [orientation, setOrientation] = useState<'landscape' | 'portrait' | 'square' | 'all'>('landscape')
const [quality, setQuality] = useState<'4k' | 'hd' | 'all'>('all')
const [results, setResults] = useState<MediaItem[]>([])
const [selected, setSelected] = useState<MediaItem[]>([])
const [isLoading, setIsLoading] = useState(false)
const [page, setPage] = useState(1)
const [previewItem, setPreviewItem] = useState<MediaItem | null>(null)
// Para clipping YouTube:
const [clipItem, setClipItem] = useState<MediaItem | null>(null)
const [clipStart, setClipStart] = useState(0)
const [clipEnd, setClipEnd] = useState(10)
const [isClipping, setIsClipping] = useState(false)
```

#### TopBar
- Título: "DarkMídia" com ícone de filme
- Input de busca: grande, com ícone de search, placeholder "Buscar footage... ex: iceland waterfall 4K"
- Botão de busca (ou Enter para pesquisar)
- Tabs de tipo: `Vídeo | Foto | Ambos`
- Pills de fonte com toggle (ligar/desligar cada fonte):
  - 🟢 Pexels
  - 🔵 Pixabay
  - ⚪ Unsplash
  - 🔴 YouTube CC
  - 🟠 Archive.org
- Filtros adicionais: Orientação (Landscape/Portrait/Square) e Qualidade (4K/HD/Todos)

#### Grid de resultados
- CSS Grid: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`
- Cada card `MediaCard`:
  - Thumbnail com aspect-ratio 16/9
  - Badge de source colorido (canto superior esquerdo)
  - Badge de duração para vídeos (canto inferior esquerdo)
  - Badge de qualidade (4K, HD)
  - **Hover:** overlay escuro com:
    - Checkbox de seleção (canto superior direito)
    - Botão de preview (ícone play) — abre modal de preview
    - Para YouTube CC: botão de tesoura para abrir clip editor
    - Botão de download direto
    - Nome do autor e licença
  - Estado selecionado: borda indigo + overlay semi-transparente indigo

#### Modal de Preview
- Ativado ao clicar no ícone play do hover
- Para fotos: exibe imagem grande
- Para vídeos Pexels/Pixabay: `<video>` com `src={previewUrl}` autoplay muted loop
- Para YouTube CC: `<iframe>` embed do YouTube
- Fechar com ESC ou clique fora
- Botão de download e de seleção dentro do modal

#### Clip Editor (somente YouTube CC)
- Abre um painel/modal ao clicar no ícone de tesoura
- Embed do vídeo com player
- Dois inputs: "Início (segundos)" e "Fim (segundos)"
- Validação: máximo 60 segundos de diferença
- Botão "Baixar Clipe" → chama `/api/media/clip`
- Loading state durante o clipping com mensagem "Extraindo clipe..."

#### Painel lateral de selecionados
- Largura fixa `w-56`
- Contador de itens selecionados
- Thumbnails miniaturas dos selecionados (máx 5 visíveis, com scroll)
- Tamanho total estimado
- Botão "Baixar todos" → faz download sequencial de cada item selecionado
  - Para itens normais: `window.open(downloadUrl)` ou `fetch + blob`
  - Para YouTube CC: chama o clip endpoint (com start=0, end=30 como padrão)
- Botão "Limpar seleção"
- Mostrar fonte de cada item com dot colorido

#### Infinite scroll / paginação
- Botão "Carregar mais" no final do grid
- Acumula resultados (não substitui)

#### Estados de loading e erro
- Skeleton cards durante loading (8 cards com pulse animation)
- Mensagem de erro se todas as fontes falharem
- Aviso se PEXELS_API_KEY não estiver configurada
- Empty state se busca retornar 0 resultados

---

## Estilo visual

Seguir o padrão dark do DarkMine:
- Fundo da página: `#080b12` com a classe `grid-bg` (já existe no globals.css)
- Cards: `bg-[#0d1117]` com `border border-white/5`
- Accents: `indigo-500/600` para selecionado, `indigo-400` para textos ativos
- Badges de fonte:
  - Pexels: `bg-emerald-500/10 text-emerald-400 border-emerald-500/20`
  - Pixabay: `bg-blue-500/10 text-blue-400 border-blue-500/20`
  - Unsplash: `bg-gray-500/10 text-gray-400 border-gray-500/20`
  - YouTube CC: `bg-red-500/10 text-red-400 border-red-500/20`
  - Archive.org: `bg-orange-500/10 text-orange-400 border-orange-500/20`
- Hover effects: `transition-all duration-200`
- Skeleton: `animate-pulse bg-white/5 rounded-lg`

---

## Ordem de implementação sugerida

1. `app/api/media/search/route.ts` — backend primeiro, testar com curl
2. `app/media/page.tsx` — UI sem clip editor ainda
3. `components/Sidebar.tsx` — adicionar item de menu
4. `app/api/media/clip/route.ts` — endpoint de clipping
5. Adicionar Clip Editor na página

---

## Comandos para testar

```bash
# Instalar yt-dlp (necessário para clipping)
pip install yt-dlp

# Testar endpoint de busca
curl -X POST http://localhost:3000/api/media/search \
  -H "Content-Type: application/json" \
  -d '{"query":"iceland waterfall","type":"video","sources":["pexels","pixabay"]}'

# Testar clipping
curl -X POST http://localhost:3000/api/media/clip \
  -H "Content-Type: application/json" \
  -d '{"youtubeId":"dQw4w9WgXcQ","startTime":10,"endTime":20}' \
  --output clip.mp4
```

---

## Notas importantes

- **yt-dlp no Netlify:** Netlify não suporta binários externos por padrão. Para produção, o clipping precisará rodar em servidor próprio (VPS) ou via Netlify Functions com uma camada de execução customizada. Por ora, implementar funcionando em desenvolvimento local (`npm run dev`).
- **CORS do Archive.org:** Pode ter limitações de CORS. Fazer todas as chamadas server-side no route handler, nunca direto do browser.
- **Rate limits:** Pexels limita 200 req/hora (free). Pixabay limita 100 req/min. Não implementar cache agora, só awareness.
- **Download de vídeos Pexels/Pixabay:** A URL de download vem diretamente da API, é um link direto. Usar `<a href={url} download>` no browser funciona para a maioria dos casos. Se der problema de CORS, fazer proxy pelo server.
- **YouTube embed:** Para preview de YouTube CC, usar `https://www.youtube.com/embed/{id}?autoplay=0` no iframe.
