import type { VideoPipelineStatus } from '@/types/database';

export const STATUS_ORDER: VideoPipelineStatus[] = ['em_producao', 'pronto', 'publicado'];

export const STATUS_LABELS: Record<VideoPipelineStatus, string> = {
  em_producao: 'Em Produção',
  pronto: 'Pronto',
  publicado: 'Publicado',
};

export const STATUS_DOT: Record<VideoPipelineStatus, string> = {
  em_producao: 'bg-amber-400',
  pronto: 'bg-cyan-400',
  publicado: 'bg-emerald-400',
};

export const STATUS_BADGE: Record<VideoPipelineStatus, string> = {
  em_producao: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  pronto: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  publicado: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};

/** Fundo do card no calendário/Kanban — tom sutil da cor do status, para
 * contrastar com a borda esquerda (cor do canal). */
export const STATUS_CARD_BG: Record<VideoPipelineStatus, string> = {
  em_producao: 'bg-amber-500/[0.07] hover:bg-amber-500/[0.12]',
  pronto: 'bg-cyan-500/[0.07] hover:bg-cyan-500/[0.12]',
  publicado: 'bg-emerald-500/[0.07] hover:bg-emerald-500/[0.12]',
};

export function nextStatus(status: VideoPipelineStatus): VideoPipelineStatus {
  const idx = STATUS_ORDER.indexOf(status);
  return STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
}
