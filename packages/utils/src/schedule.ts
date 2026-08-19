import type { Restaurant } from '@hosteleria/sanity-client';

const DAY_NUM: Record<string, number> = { Su: 0, Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6 };

// Etiquetas cortas de día por locale (para grouping y day-by-day)
const DAY_LABELS: Record<string, string[]> = {
  // orden: Lun, Mar, Mié, Jue, Vie, Sáb, Dom (arranca en Mo para orden semanal humano)
  es: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  ca: ['Dl', 'Dm', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'],
};

const CLOSED_LABEL: Record<string, string> = {
  es: 'Cerrado',
  en: 'Closed',
  ca: 'Tancat',
};

export type HoursByDay = Record<number, Array<[number, number]>>;

/**
 * Convierte `restaurant.horariosSemana` (array de días con turnos "HH:mm")
 * a un mapa día 0-6 (0=Domingo, 6=Sábado) → array de [horaApertura, horaCierre] en decimal.
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

export type ScheduleRow = {
  /** Etiqueta del rango de días. Ej: "Mar–Sáb" o "Lun". */
  label: string;
  /** Turnos formateados. Ej: ["13:00–16:00", "20:30–23:30"] o [] si cerrado. */
  shifts: string[];
  /** true si este bloque no tiene turnos (día(s) cerrados). */
  closed: boolean;
  /** true si HOY está incluido en este bloque (para highlight). */
  isToday: boolean;
};

/**
 * Formatea `horariosSemana` en filas agrupadas para mostrar bonito en la UI.
 * Agrupa días consecutivos con los MISMOS turnos → una sola fila con rango.
 * Ejemplo: L cerrado, M-S abierto igual, D cerrado → 3 filas:
 *   [{ label: "Lun", closed: true, ... },
 *    { label: "Mar–Sáb", shifts: ["13:00–16:00", "20:30–23:30"], ... },
 *    { label: "Dom", closed: true, ... }]
 */
export function formatSchedule(
  horariosSemana: Restaurant['horariosSemana'],
  locale: string = 'es',
): ScheduleRow[] {
  const labels = DAY_LABELS[locale] ?? DAY_LABELS.es;
  const closedLabel = CLOSED_LABEL[locale] ?? CLOSED_LABEL.es;

  // Orden humano de la semana: Lun a Dom (índices 1..6 + 0)
  const humanOrder = [1, 2, 3, 4, 5, 6, 0];
  const todayIdx = new Date().getDay();

  // Construimos un array [dayIdx, shiftsAsString] siguiendo el orden humano
  const perDay = humanOrder.map((dayIdx) => {
    const day = (horariosSemana ?? []).find((d) => DAY_NUM[d.dia] === dayIdx);
    const shifts = (day?.turnos ?? []).map((tu) => `${tu.apertura}–${tu.cierre}`);
    return { dayIdx, shifts, key: shifts.join('|') };
  });

  // Agrupamos días CONSECUTIVOS con el mismo `key` (mismos turnos)
  const rows: ScheduleRow[] = [];
  for (let i = 0; i < perDay.length; i++) {
    const start = perDay[i];
    let end = i;
    while (end + 1 < perDay.length && perDay[end + 1].key === start.key) {
      end++;
    }
    // Label: día único → "Lun"; rango → "Mar–Sáb"
    const startLabelIdx = start.dayIdx === 0 ? 6 : start.dayIdx - 1; // 0=Dom → posición 6 en labels; Lun(1) → 0, etc
    const endLabelIdx = perDay[end].dayIdx === 0 ? 6 : perDay[end].dayIdx - 1;
    const label =
      i === end
        ? labels[startLabelIdx]
        : `${labels[startLabelIdx]}–${labels[endLabelIdx]}`;

    const isToday = perDay.slice(i, end + 1).some((p) => p.dayIdx === todayIdx);

    rows.push({
      label,
      shifts: start.shifts.length ? start.shifts : [closedLabel],
      closed: start.shifts.length === 0,
      isToday,
    });

    i = end;
  }
  return rows;
}
