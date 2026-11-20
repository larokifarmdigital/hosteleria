import { z } from 'zod';
import type { ScheduleDay } from '@hosteleria/api-client';

export const DAY_LABEL: Record<ScheduleDay['day'], string> = {
  Mo: 'Lunes',
  Tu: 'Martes',
  We: 'Miércoles',
  Th: 'Jueves',
  Fr: 'Viernes',
  Sa: 'Sábado',
  Su: 'Domingo'
};

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Elige una hora.');

const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Un turno que cierra antes de abrir cruza la medianoche (20:00 – 01:00). */
export function closesNextDay(open: string, close: string): boolean {
  return /^\d\d:\d\d$/.test(open) && /^\d\d:\d\d$/.test(close) && toMinutes(close) < toMinutes(open);
}

function interval(open: string, close: string): [number, number] {
  const start = toMinutes(open);
  const end = toMinutes(close);
  return [start, end > start ? end : end + 24 * 60];
}

export const scheduleSchema = z
  .array(z.object({
    day: z.enum(['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']),
    shifts: z.array(z.object({ open: time, close: time }))
  }))
  .superRefine((days, ctx) => {
    days.forEach((day, d) => {
      const valid = day.shifts.map(s => time.safeParse(s.open).success && time.safeParse(s.close).success);
      day.shifts.forEach((shift, i) => {
        if (!valid[i]) return;
        if (shift.open === shift.close) {
          ctx.addIssue({ code: 'custom', path: [d, 'shifts', i, 'close'], message: 'El cierre no puede ser a la misma hora que la apertura.' });
          return;
        }
        const [start, end] = interval(shift.open, shift.close);
        const clash = day.shifts.some((other, j) => {
          if (j >= i || !valid[j] || other.open === other.close) return false;
          const [oStart, oEnd] = interval(other.open, other.close);
          return start < oEnd && oStart < end;
        });
        if (clash) {
          ctx.addIssue({ code: 'custom', path: [d, 'shifts', i, 'open'], message: 'Este turno se pisa con otro del mismo día.' });
        }
      });
    });
  });

export type ScheduleValues = z.infer<typeof scheduleSchema>;

/** Solo los días con turnos, en orden fijo: así se compara con lo publicado, que no guarda los días cerrados. */
export function scheduleForCompare(schedule: ScheduleDay[] | undefined): unknown {
  return (schedule ?? [])
    .filter(d => d.shifts.length > 0)
    .map(d => ({ day: d.day, shifts: d.shifts.map(s => `${s.open}-${s.close}`) }))
    .sort((a, b) => a.day.localeCompare(b.day));
}
