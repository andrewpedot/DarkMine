import { NextRequest } from 'next/server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function checkAuth(req: NextRequest): boolean {
  const secret = process.env.MCP_SHARED_SECRET;
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

function textResult(payload: unknown, isError = false) {
  return {
    content: [{ type: 'text' as const, text: typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2) }],
    isError,
  };
}

async function resolveChannelId(supabase: ReturnType<typeof createAdminClient>, identifier: string): Promise<string | null> {
  if (UUID_RE.test(identifier)) return identifier;
  const { data } = await supabase.from('channels').select('id').ilike('name', identifier).limit(1).maybeSingle();
  return data?.id ?? null;
}

function buildServer() {
  const server = new McpServer({ name: 'darkmine', version: '1.0.0' });
  const supabase = createAdminClient();

  server.registerTool(
    'list_channels',
    { description: 'Lista todos os canais cadastrados no DarkMine, com código, nicho e status.' },
    async () => {
      const { data, error } = await supabase.from('channels').select('id, channel_code, name, niche, tipo, status').order('name');
      if (error) return textResult(`Erro: ${error.message}`, true);
      return textResult(data);
    }
  );

  server.registerTool(
    'get_next_video',
    {
      description: 'Retorna o próximo vídeo pendente (não publicado) de um canal, ordenado pela data agendada mais próxima.',
      inputSchema: { channel: z.string().describe('Nome ou ID do canal') },
    },
    async ({ channel }) => {
      const channelId = await resolveChannelId(supabase, channel);
      if (!channelId) return textResult(`Canal "${channel}" não encontrado.`, true);
      const { data, error } = await supabase
        .from('scheduled_videos')
        .select('id, title, scheduled_date, status, sequence_number')
        .eq('channel_id', channelId)
        .neq('status', 'publicado')
        .order('scheduled_date', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) return textResult(`Erro: ${error.message}`, true);
      if (!data) return textResult('Nenhum vídeo pendente encontrado para esse canal.');
      return textResult(data);
    }
  );

  server.registerTool(
    'list_pipeline',
    {
      description: 'Lista os vídeos não publicados (em produção/prontos) de um canal, ou de todos os canais se nenhum for informado.',
      inputSchema: { channel: z.string().optional().describe('Nome ou ID do canal (opcional)') },
    },
    async ({ channel }) => {
      let query = supabase
        .from('scheduled_videos')
        .select('id, channel_id, title, scheduled_date, status, sequence_number')
        .neq('status', 'publicado')
        .order('scheduled_date', { ascending: true });

      if (channel) {
        const channelId = await resolveChannelId(supabase, channel);
        if (!channelId) return textResult(`Canal "${channel}" não encontrado.`, true);
        query = query.eq('channel_id', channelId);
      }

      const { data, error } = await query;
      if (error) return textResult(`Erro: ${error.message}`, true);
      return textResult(data);
    }
  );

  server.registerTool(
    'mark_video_ready',
    {
      description: 'Marca um vídeo como "pronto" (roteiro finalizado), opcionalmente atualizando o título final.',
      inputSchema: {
        videoId: z.string().describe('ID do vídeo (scheduled_videos.id)'),
        title: z.string().optional().describe('Novo título, se o roteiro definiu um título final diferente'),
      },
    },
    async ({ videoId, title }) => {
      const updates: Record<string, unknown> = { status: 'pronto' };
      if (title) updates.title = title;
      const { error } = await supabase.from('scheduled_videos').update(updates).eq('id', videoId);
      if (error) return textResult(`Erro: ${error.message}`, true);
      return textResult(`Vídeo ${videoId} marcado como pronto.${title ? ` Título atualizado para "${title}".` : ''}`);
    }
  );

  server.registerTool(
    'get_channel_metrics',
    {
      description:
        'Retorna a evolução do canal: CTR médio, views médias, retenção média, watch time total, conversão em inscritos e a lista de vídeos publicados com seus números.',
      inputSchema: { channel: z.string().describe('Nome ou ID do canal') },
    },
    async ({ channel }) => {
      const channelId = await resolveChannelId(supabase, channel);
      if (!channelId) return textResult(`Canal "${channel}" não encontrado.`, true);

      const { data: videos } = await supabase
        .from('scheduled_videos')
        .select('id, title, thumbnail_ctr, thumbnail_impressions, published_at')
        .eq('channel_id', channelId)
        .eq('status', 'publicado');

      const videoIds = (videos ?? []).map((v) => v.id);
      const { data: allMetrics } = videoIds.length
        ? await supabase.from('video_metrics').select('*').in('scheduled_video_id', videoIds).order('synced_at', { ascending: false })
        : { data: [] as any[] };

      const latestByVideo = new Map<string, any>();
      (allMetrics ?? []).forEach((m) => {
        if (!latestByVideo.has(m.scheduled_video_id)) latestByVideo.set(m.scheduled_video_id, m);
      });
      const latest = Array.from(latestByVideo.values());

      const ctrValues = (videos ?? []).filter((v) => v.thumbnail_ctr != null).map((v) => v.thumbnail_ctr as number);
      const avgCtr = ctrValues.length ? ctrValues.reduce((a, b) => a + b, 0) / ctrValues.length : null;
      const avgViews = latest.length ? Math.round(latest.reduce((s, m) => s + (m.views ?? 0), 0) / latest.length) : null;
      const withRetention = latest.filter((m) => m.avg_view_duration_sec != null);
      const avgRetentionSec = withRetention.length
        ? withRetention.reduce((s, m) => s + (m.avg_view_duration_sec ?? 0), 0) / withRetention.length
        : null;
      const watchTimeTotalMin = latest.reduce((s, m) => s + (m.watch_time_minutes ?? 0), 0);
      const subsGained = latest.reduce((s, m) => s + (m.subscribers_gained ?? 0), 0);
      const totalViews = latest.reduce((s, m) => s + (m.views ?? 0), 0);
      const subsConversionPer1k = totalViews > 0 ? (subsGained / totalViews) * 1000 : null;

      return textResult({
        videosPublicados: (videos ?? []).length,
        ctrMedioPct: avgCtr,
        viewsMedias: avgViews,
        retencaoMediaSeg: avgRetentionSec,
        watchTimeTotalMin,
        conversaoInscritosPor1kViews: subsConversionPer1k,
        videos: (videos ?? []).map((v) => ({
          title: v.title,
          ctrPct: v.thumbnail_ctr,
          impressoes: v.thumbnail_impressions,
          publicadoEm: v.published_at,
        })),
      });
    }
  );

  return server;
}

async function handleMcp(req: NextRequest): Promise<Response> {
  if (!checkAuth(req)) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const server = buildServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);
  const response = await transport.handleRequest(req);
  await server.close();
  return response;
}

export async function POST(req: NextRequest) {
  return handleMcp(req);
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return new Response('Unauthorized', { status: 401 });
  return new Response('Method not supported (stateless server — use POST)', { status: 405 });
}
