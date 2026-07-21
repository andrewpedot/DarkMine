import type { ScheduledVideo } from '@/types/database';

/**
 * Numeração exibida (01, 02, 03...) por canal, calculada pela ordem cronológica
 * atual dos vídeos — não pelo `sequence_number` bruto do banco, que pode ter
 * buracos por causa de vídeos de teste criados/excluídos ao longo do tempo.
 */
export function computeDisplaySequence(videos: ScheduledVideo[]): Map<string, number> {
  const byChannel = new Map<string, ScheduledVideo[]>();
  videos.forEach((v) => {
    const list = byChannel.get(v.channel_id) ?? [];
    list.push(v);
    byChannel.set(v.channel_id, list);
  });

  const result = new Map<string, number>();
  byChannel.forEach((list) => {
    list
      .slice()
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date) || a.sequence_number - b.sequence_number)
      .forEach((v, i) => result.set(v.id, i + 1));
  });
  return result;
}
