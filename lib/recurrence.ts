import type { RecurrenceType } from '@/types/database';

function toDateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Calcula as próximas `count` datas de publicação a partir de startDate,
 * respeitando o padrão de recorrência do canal.
 */
export function computeScheduleDates(
  startDate: string,
  recurrenceType: RecurrenceType,
  recurrenceDays: number[] = [],
  count = 10
): string[] {
  const start = toDateOnly(new Date(startDate + 'T00:00:00'));
  const dates: string[] = [];

  if (recurrenceType === 'diario') {
    for (let i = 0; i < count; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dates.push(formatISODate(d));
    }
    return dates;
  }

  if (recurrenceType === 'seg_sex') {
    const d = new Date(start);
    while (dates.length < count) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) dates.push(formatISODate(d));
      d.setDate(d.getDate() + 1);
    }
    return dates;
  }

  if (recurrenceType === 'dia_sim_dia_nao') {
    for (let i = 0; i < count; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i * 2);
      dates.push(formatISODate(d));
    }
    return dates;
  }

  // custom: só publica nos dias da semana selecionados (0=domingo..6=sábado)
  const daysSet = new Set(recurrenceDays);
  if (daysSet.size === 0) return dates;
  const d = new Date(start);
  let guard = 0;
  while (dates.length < count && guard < count * 30) {
    if (daysSet.has(d.getDay())) dates.push(formatISODate(d));
    d.setDate(d.getDate() + 1);
    guard++;
  }
  return dates;
}

export const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  diario: 'Todo dia',
  seg_sex: 'Segunda a sexta',
  dia_sim_dia_nao: 'Dia sim, dia não',
  custom: 'Personalizado',
};

export const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
