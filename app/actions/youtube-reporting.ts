'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getValidAccessToken } from '@/lib/youtube-token';
import { revalidatePath } from 'next/cache';

const REPORT_TYPE_ID = 'channel_reach_basic_a1';

interface ReportingReport {
  id: string;
  startTime: string;
  endTime: string;
  downloadUrl?: string;
}

async function ensureReportingJob(channelId: string, accessToken: string): Promise<string> {
  const supabase = createAdminClient();
  const { data: auth } = await supabase
    .from('channel_youtube_auth')
    .select('reporting_job_id')
    .eq('channel_id', channelId)
    .single();

  if (auth?.reporting_job_id) return auth.reporting_job_id;

  // Um job já pode existir de uma tentativa anterior (ex.: erro ao salvar o id) — evita
  // criar jobs duplicados para o mesmo tipo de relatório.
  const listResp = await fetch('https://youtubereporting.googleapis.com/v1/jobs', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (listResp.ok) {
    const listJson = await listResp.json();
    const existing = (listJson.jobs || []).find((j: any) => j.reportTypeId === REPORT_TYPE_ID && !j.systemManaged);
    if (existing) {
      await supabase.from('channel_youtube_auth').update({ reporting_job_id: existing.id }).eq('channel_id', channelId);
      return existing.id;
    }
  }

  const createResp = await fetch('https://youtubereporting.googleapis.com/v1/jobs', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reportTypeId: REPORT_TYPE_ID, name: 'DarkMine — alcance de miniaturas' }),
  });
  if (!createResp.ok) {
    const body = await createResp.text();
    throw new Error(`Falha ao criar job de relatório: ${body}`);
  }
  const created = await createResp.json();
  await supabase.from('channel_youtube_auth').update({ reporting_job_id: created.id }).eq('channel_id', channelId);
  return created.id;
}

/** Parser simples de CSV — os relatórios da Reporting API não têm campos com vírgula/aspas. */
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cells[i]));
    return row;
  });
}

export async function syncThumbnailReach(channelId: string): Promise<{ videosUpdated: number; reportsProcessed: number }> {
  const supabase = createAdminClient();
  const accessToken = await getValidAccessToken(channelId);
  const jobId = await ensureReportingJob(channelId, accessToken);

  const { data: auth } = await supabase
    .from('channel_youtube_auth')
    .select('reporting_last_report_time')
    .eq('channel_id', channelId)
    .single();

  const reportsUrl = new URL(`https://youtubereporting.googleapis.com/v1/jobs/${jobId}/reports`);
  if (auth?.reporting_last_report_time) {
    reportsUrl.searchParams.set('createdAfter', auth.reporting_last_report_time);
  }

  const reportsResp = await fetch(reportsUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!reportsResp.ok) {
    const body = await reportsResp.text();
    throw new Error(`Falha ao listar relatórios: ${body}`);
  }
  const reportsJson = await reportsResp.json();
  const reports: ReportingReport[] = reportsJson.reports || [];
  if (reports.length === 0) return { videosUpdated: 0, reportsProcessed: 0 };

  const { data: videos } = await supabase
    .from('scheduled_videos')
    .select('id, youtube_video_id, thumbnail_impressions, thumbnail_ctr')
    .eq('channel_id', channelId)
    .not('youtube_video_id', 'is', null);

  const videoByYtId = new Map((videos ?? []).map((v) => [v.youtube_video_id, v]));

  // Acumula os deltas de cada vídeo somando todos os relatórios diários novos antes de
  // atualizar o banco — cada relatório cobre 1 dia, então o CTR final é uma média
  // ponderada pelas impressões de cada dia, não uma média simples entre os dias.
  const deltas = new Map<string, { impressions: number; weightedCtrSum: number }>();
  let maxEndTime = auth?.reporting_last_report_time ?? '';

  for (const report of reports) {
    if (!report.downloadUrl) continue;
    const csvResp = await fetch(report.downloadUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!csvResp.ok) {
      console.warn('[youtube-reporting] falha ao baixar relatório', report.id, await csvResp.text());
      continue;
    }
    const rows = parseCsv(await csvResp.text());
    for (const row of rows) {
      const videoId = row['video_id'];
      if (!videoByYtId.has(videoId)) continue;
      const impressions = Number(row['video_thumbnail_impressions'] ?? 0);
      const ctr = Number(row['video_thumbnail_impressions_ctr'] ?? 0);
      const entry = deltas.get(videoId) ?? { impressions: 0, weightedCtrSum: 0 };
      entry.impressions += impressions;
      entry.weightedCtrSum += impressions * ctr;
      deltas.set(videoId, entry);
    }
    if (report.endTime > maxEndTime) maxEndTime = report.endTime;
  }

  let videosUpdated = 0;
  for (const [ytVideoId, delta] of deltas) {
    const video = videoByYtId.get(ytVideoId)!;
    const priorImpressions = video.thumbnail_impressions ?? 0;
    const priorCtr = video.thumbnail_ctr ?? 0;
    const totalImpressions = priorImpressions + delta.impressions;
    const totalCtr = totalImpressions > 0 ? (priorImpressions * priorCtr + delta.weightedCtrSum) / totalImpressions : 0;

    const { error: updateError } = await supabase
      .from('scheduled_videos')
      .update({
        thumbnail_impressions: totalImpressions,
        thumbnail_ctr: Number((totalCtr * 100).toFixed(2)),
        thumbnail_updated_at: new Date().toISOString(),
      })
      .eq('id', video.id);
    if (!updateError) videosUpdated += 1;
  }

  if (maxEndTime) {
    await supabase.from('channel_youtube_auth').update({ reporting_last_report_time: maxEndTime }).eq('channel_id', channelId);
  }

  revalidatePath('/dashboard');
  return { videosUpdated, reportsProcessed: reports.length };
}
