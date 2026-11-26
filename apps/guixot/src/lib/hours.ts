import type { DayHours } from './queries';

const DAY_INDEX: Record<DayHours['dia'], number> = { Su: 0, Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6 };

// Índice = Date.getDay() (0 = domingo).
const DAY_NAMES: Record<string, string[]> = {
  es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
  ca: ['diumenge', 'dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
};

const STRINGS = {
  es: {
    hours: 'Horario',
    seeHours: 'Ver horario',
    todayHours: 'Horario de hoy',
    fullWeek: 'Ver toda la semana',
    today: 'Hoy',
    closedDay: 'Cerrado',
    open: 'Abierto',
    closed: 'Cerrado',
    closesAt: 'Cierra a las {t}',
    opensToday: 'Abre hoy a las {t}',
    opensTomorrow: 'Abre mañana a las {t}',
    opensDay: 'Abre el {d} a las {t}'
  },
  ca: {
    hours: 'Horari',
    seeHours: 'Veure horari',
    todayHours: 'Horari d’avui',
    fullWeek: 'Veure tota la setmana',
    today: 'Avui',
    closedDay: 'Tancat',
    open: 'Obert',
    closed: 'Tancat',
    closesAt: 'Tanca a les {t}',
    opensToday: 'Obre avui a les {t}',
    opensTomorrow: 'Obre demà a les {t}',
    opensDay: 'Obre {d} a les {t}'
  },
  en: {
    hours: 'Opening hours',
    seeHours: 'See opening hours',
    todayHours: 'Today’s hours',
    fullWeek: 'See the full week',
    today: 'Today',
    closedDay: 'Closed',
    open: 'Open',
    closed: 'Closed',
    closesAt: 'Closes at {t}',
    opensToday: 'Opens today at {t}',
    opensTomorrow: 'Opens tomorrow at {t}',
    opensDay: 'Opens {d} at {t}'
  }
} as const;

export type HoursStrings = { [K in keyof (typeof STRINGS)['es']]: string };

export type WeekRow = {
  /** Date.getDay() de los días de la fila: lo usa el script para marcar "hoy". */
  days: number[];
  name: string;
  shifts: string[];
};

// Cómo se nombra un tramo de días seguidos con el mismo horario.
const RANGE = {
  es: { pair: '{a} y {b}', range: '{a} a {b}', all: 'Todos los días' },
  ca: { pair: '{a} i {b}', range: '{a} a {b}', all: 'Cada dia' },
  en: { pair: '{a} and {b}', range: '{a} to {b}', all: 'Every day' }
} as const;

export type HoursUi = {
  hasHours: boolean;
  strings: HoursStrings;
  /** Lunes → domingo, con los días seguidos de mismo horario en una sola fila. */
  week: WeekRow[];
  /** Lo que lee HoursScript: turnos en minutos por día + textos. */
  config: {
    timeZone: string;
    days: Record<number, Array<[number, number]>>;
    dayNames: string[];
    strings: HoursStrings;
  };
};

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * El sitio es estático: "hoy" y "abierto ahora" no se pueden resolver en el
 * build. Aquí solo se prepara la semana y la config; el estado lo calcula
 * HoursScript en el navegador, en la hora del local y no en la del visitante.
 */
export function buildHoursUi(horariosSemana: DayHours[] | undefined, locale: string): HoursUi {
  const strings: HoursStrings = STRINGS[locale as keyof typeof STRINGS] ?? STRINGS.es;
  const dayNames = DAY_NAMES[locale] ?? DAY_NAMES.es;

  const days: Record<number, Array<[number, number]>> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  const labels: Record<number, string[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

  for (const d of horariosSemana ?? []) {
    const idx = DAY_INDEX[d.dia];
    if (idx == null) continue;
    for (const shift of d.turnos ?? []) {
      if (!shift.apertura || !shift.cierre) continue;
      const start = toMinutes(shift.apertura);
      let end = toMinutes(shift.cierre);
      // Un cierre de madrugada (20:00–01:00) pertenece al día en que se abre.
      if (end <= start) end += 24 * 60;
      days[idx].push([start, end]);
      labels[idx].push(`${shift.apertura}–${shift.cierre}`);
    }
    days[idx].sort((a, b) => a[0] - b[0]);
  }

  // Días seguidos con el mismo horario se leen mejor juntos ("Lunes a viernes").
  const range = RANGE[locale as keyof typeof RANGE] ?? RANGE.es;
  const inEnglish = locale === 'en';
  const runs: Array<{ days: number[]; shifts: string[] }> = [];
  for (const day of [1, 2, 3, 4, 5, 6, 0]) {
    const last = runs[runs.length - 1];
    if (last && last.shifts.join('|') === labels[day].join('|')) last.days.push(day);
    else runs.push({ days: [day], shifts: labels[day] });
  }
  const week: WeekRow[] = runs.map(({ days: runDays, shifts }) => {
    const first = dayNames[runDays[0]];
    const lastName = dayNames[runDays[runDays.length - 1]];
    // En inglés los días son nombre propio; en castellano y catalán solo el primero va en mayúscula.
    const fill = (tpl: string) => tpl.replace('{a}', capitalize(first)).replace('{b}', inEnglish ? capitalize(lastName) : lastName);
    const name =
      runDays.length === 7 ? range.all
      : runDays.length === 1 ? capitalize(first)
      : runDays.length === 2 ? fill(range.pair)
      : fill(range.range);
    return { days: runDays, name, shifts };
  });

  return {
    hasHours: Object.values(days).some((shifts) => shifts.length > 0),
    strings,
    week,
    config: { timeZone: 'Europe/Madrid', days, dayNames, strings }
  };
}
