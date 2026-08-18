import type { Restaurant } from './queries';

const DAY_NUM: Record<string, number> = { Su: 0, Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6 };

export type HoursByDay = Record<number, Array<[number, number]>>;

/**
 * Convierte `restaurant.horariosSemana` (array de días con turnos "HH:mm")
 * a un mapa día 0-6 → array de [horaApertura, horaCierre] en decimal.
 */
export function buildHoursByDay(horariosSemana: Restaurant['horariosSemana']): HoursByDay {
  const out: HoursByDay = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  for (const d of horariosSemana ?? []) {
    const num = DAY_NUM[d.dia];
    if (num == null) continue;
    out[num] = (d.turnos ?? []).map((tu) => {
      const hm = (s: string) => {
        const [h, m] = s.split(':').map(Number);
        return h + (m || 0) / 60;
      };
      return [hm(tu.apertura), hm(tu.cierre)] as [number, number];
    });
  }
  return out;
}
