# DarkMine Opportunity Research Module

Setup instructions for the DarkMine research module.

## Prerequisites

1. **Supabase Project** - Create a project at https://supabase.com
2. **YouTube Data API** - Enable at https://console.cloud.google.com

## Environment Variables

Create or update `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# YouTube Data API v3
NEXT_PUBLIC_YOUTUBE_API_KEY=your-youtube-api-key
YOUTUBE_API_KEY=your-youtube-api-key
```

## Database Setup

1. Run migration in Supabase SQL Editor:
   ```bash
   # Copy and run the contents of:
   migrations/001_darkmine_schema.sql
   migrations/002_quota_rpc.sql
   ```

2. Tables created:
   - `niches` - Niche classification tree
   - `search_sessions` - Search session tracking
   - `videos` - Cached video data
   - `channels` - Cached channel data
   - `analysis_results` - Scored results
   - `youtube_quota` - API quota tracking
   - `projects` - Saved title projects

## API Routes

- `POST /api/darkmine/search` - Start new search
- `GET /api/darkmine/results/[id]` - Get session results
- `GET /api/darkmine/sessions` - List all sessions
- `GET /api/darkmine/niches` - Get niche tree

## Run locally

```bash
npm run dev
# Visit http://localhost:3000/darkmine
```

## Features

1. **Opportunity Scouting** - Search YouTube for video opportunities
2. **Scoring Engine**:
   - Faceless Score (no face visible)
   - Comment Gold Score (comments with buying intent)
   - Timing Bonus (new channels)
   - Monetization Signals (affiliate links)
3. **Session History** - Track all searches
4. **One-click Hook** - Send to hook generator