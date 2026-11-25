'use client';

import { useState } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { AlertTriangle, ChevronDown, Copy, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { SWITCH_INPUT } from '@/components/ui/inputs';
import { TimePicker } from '@/components/ui/TimePicker';
import { DAY_LABEL, closesNextDay, type ScheduleValues } from '@/lib/forms/schedule';
import { cn } from '@/lib/utils';

type Day = ScheduleValues[number];
type Shift = Day['shifts'][number];
interface FormShape { schedule: ScheduleValues }

const MAX_SHIFTS = 3;
const ORDINAL = ['Primer horario', 'Segundo horario', 'Tercer horario'];
// Lo habitual en un restaurante: comidas y cenas. Se ajusta después.
const SEED: Shift[] = [{ open: '13:00', close: '16:00' }, { open: '20:00', close: '23:30' }, { open: '08:00', close: '12:00' }];

export const summarize = (shifts: Shift[]) => (shifts.length === 0 ? 'Cerrado' : shifts.map(s => `${s.open || '--:--'}–${s.close || '--:--'}`).join(' · '));

function duration(open: string, close: string): string {
  if (!/^\d\d:\d\d$/.test(open) || !/^\d\d:\d\d$/.test(close)) return '';
  const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  const total = (minutes(close) - minutes(open) + 24 * 60) % (24 * 60);
  if (total === 0) return '';
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/**
 * Edita `schedule` del formulario que lo contiene: siete días fijos. Cada día es una
 * fila con su resumen y un interruptor; las horas se ajustan al desplegarla.
 */
export function ScheduleEditor() {
  const { control, setValue, getValues, formState: { errors } } = useFormContext<FormShape>();
  const { fields } = useFieldArray({ control, name: 'schedule' });
  const days = (useWatch({ control, name: 'schedule' }) ?? []) as ScheduleValues;
  const [expanded, setExpanded] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const setShifts = (index: number, shifts: Shift[]) =>
    setValue(`schedule.${index}.shifts`, shifts, { shouldDirty: true, shouldValidate: true });

  const copyFrom = (target: number, source: number) => {
    setShifts(target, getValues(`schedule.${source}.shifts`).map(s => ({ ...s })));
    setAnnouncement(`Horario del ${DAY_LABEL[fields[source].day].toLowerCase()} copiado al ${DAY_LABEL[fields[target].day].toLowerCase()}.`);
  };
  const copyToAll = (from: number) => {
    const source = getValues(`schedule.${from}.shifts`);
    fields.forEach((_, i) => { if (i !== from) setShifts(i, source.map(s => ({ ...s }))); });
    setAnnouncement(`Horario del ${DAY_LABEL[fields[from].day].toLowerCase()} copiado a todos los días.`);
  };

  return (
    <div>
      <div className="overflow-hidden rounded-[10px] border border-[color:var(--color-border)] bg-white shadow-[var(--shadow-sm)]">
        {fields.map((field, i) => {
          const shifts = days[i]?.shifts ?? [];
          const open = shifts.length > 0;
          const isExpanded = expanded === i && open;
          const label = DAY_LABEL[field.day];
          const dayErrors = errors.schedule?.[i]?.shifts;
          const hasError = Array.isArray(dayErrors) && dayErrors.some(Boolean);
          return (
            <div key={field.id} role="group" aria-label={label} className={cn(i > 0 && 'border-t border-[color:var(--color-border)]')}>
              <div className={cn('flex items-center gap-2 pr-3 sm:pr-4', isExpanded && 'bg-[color:var(--color-surface-2)]')}>
                <button
                  type="button"
                  id={`h-${field.day}`}
                  aria-expanded={open ? isExpanded : undefined}
                  disabled={!open}
                  onClick={() => setExpanded(isExpanded ? null : i)}
                  aria-label={`${label}: ${summarize(shifts)}.${hasError ? ' Hay una hora por corregir.' : ''}${open ? (isExpanded ? ' Ocultar las horas' : ' Cambiar las horas') : ''}`}
                  className="flex min-h-14 min-w-0 flex-1 cursor-pointer items-center gap-3 border-0 bg-transparent py-3 pl-4 pr-2 text-left transition-colors hover:bg-[color:var(--color-surface-2)] disabled:cursor-default disabled:hover:bg-transparent sm:gap-4 sm:pl-5"
                >
                  <span className="w-10 flex-shrink-0 text-[14px] font-semibold text-[color:var(--color-ink)] sm:w-[84px]">
                    <span className="sm:hidden">{label.slice(0, 3)}</span>
                    <span className="hidden sm:inline">{label}</span>
                  </span>
                  <span className={cn('tabular min-w-0 flex-1 truncate text-[13.5px]', open ? 'text-[color:var(--color-ink-soft)]' : 'text-[color:var(--color-muted)]')}>
                    {summarize(shifts)}
                  </span>
                  {hasError && <AlertTriangle aria-hidden className="h-4 w-4 flex-shrink-0 text-[color:var(--color-danger)]" />}
                  {open && <ChevronDown aria-hidden className={cn('h-4 w-4 flex-shrink-0 text-[color:var(--color-muted)] transition-transform motion-reduce:transition-none', isExpanded && 'rotate-180')} />}
                </button>
                {/* Abierto o cerrado se cambia sin desplegar. */}
                <label className="flex min-h-11 flex-shrink-0 cursor-pointer items-center gap-2 text-[13px] text-[color:var(--color-ink-soft)]">
                  <span aria-hidden className="hidden w-[56px] text-right sm:inline">{open ? 'Abierto' : 'Cerrado'}</span>
                  <input
                    type="checkbox"
                    role="switch"
                    id={`h-${field.day}-abierto`}
                    className={SWITCH_INPUT}
                    checked={open}
                    aria-label={`${label} abierto`}
                    onChange={e => {
                      // Al abrir un día se le ponen unas horas de partida y se despliega para ajustarlas.
                      setShifts(i, e.target.checked ? [{ ...SEED[0] }] : []);
                      setExpanded(e.target.checked ? i : null);
                    }}
                  />
                </label>
              </div>

              {isExpanded && (
                <div className="flex flex-col gap-3 bg-[color:var(--color-surface-2)] px-4 pb-4 pt-1 sm:px-5">
                  <div className="flex flex-col gap-2">
                    {shifts.map((shift, s) => {
                      const shiftErrors = Array.isArray(dayErrors) ? dayErrors[s] : undefined;
                      const message = shiftErrors?.open?.message ?? shiftErrors?.close?.message;
                      const id = `h-${field.day}-${s}`;
                      const update = (patch: Partial<Shift>) => setShifts(i, shifts.map((x, k) => (k === s ? { ...x, ...patch } : x)));
                      return (
                        <div key={s} className={cn('rounded-[8px] border bg-white p-3', message ? 'border-[color:var(--color-danger)]' : 'border-[color:var(--color-border)]')}>
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="text-[13px] font-semibold text-[color:var(--color-ink-soft)]">{ORDINAL[s] ?? `Horario ${s + 1}`}</span>
                            <div className="flex items-center gap-1">
                              <span className="tabular text-[12px] text-[color:var(--color-muted)]">{duration(shift.open, shift.close)}</span>
                              <button
                                type="button"
                                aria-label={`Quitar el ${(ORDINAL[s] ?? `horario ${s + 1}`).toLowerCase()} del ${label.toLowerCase()}`}
                                onClick={() => {
                                  setShifts(i, shifts.filter((_, k) => k !== s));
                                  if (shifts.length === 1) setExpanded(null);
                                  // El botón pulsado desaparece: el foco pasa a la fila del día (o a su interruptor, si queda cerrado).
                                  requestAnimationFrame(() => document.getElementById(shifts.length === 1 ? `h-${field.day}-abierto` : `h-${field.day}`)?.focus());
                                }}
                                className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-full border-0 bg-transparent px-2.5 text-[12.5px] font-medium text-[color:var(--color-muted)] transition-colors hover:bg-[color:var(--color-danger-soft)] hover:text-[color:var(--color-danger)] sm:h-8"
                              >
                                <Trash2 aria-hidden className="h-3.5 w-3.5" />
                                Quitar
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-end gap-3">
                            <div className="flex flex-col gap-1">
                              <span aria-hidden className="select-none text-[12.5px] text-[color:var(--color-muted)]">Abre</span>
                              <TimePicker id={`${id}-abre`} value={shift.open} onChange={open => update({ open })} label={`${label}, ${(ORDINAL[s] ?? '').toLowerCase()}: abre`} invalid={!!shiftErrors?.open} describedBy={message ? `${id}-error` : undefined} />
                            </div>
                            <span aria-hidden className="pb-2.5 text-[13px] text-[color:var(--color-muted)]">→</span>
                            <div className="flex flex-col gap-1">
                              <span aria-hidden className="select-none text-[12.5px] text-[color:var(--color-muted)]">Cierra</span>
                              <TimePicker id={`${id}-cierra`} value={shift.close} onChange={close => update({ close })} label={`${label}, ${(ORDINAL[s] ?? '').toLowerCase()}: cierra`} invalid={!!shiftErrors?.close} describedBy={message ? `${id}-error` : undefined} />
                            </div>
                          </div>
                          {message ? (
                            <p id={`${id}-error`} role="alert" className="m-0 mt-2 flex items-center gap-1.5 text-[12.5px] font-medium text-[color:var(--color-danger)]">
                              <AlertTriangle aria-hidden className="h-3.5 w-3.5 flex-shrink-0" />
                              {message}
                            </p>
                          ) : closesNextDay(shift.open, shift.close) && (
                            <p className="m-0 mt-2 text-[12.5px] text-[color:var(--color-muted)]">Cierra de madrugada, ya en el día siguiente.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {shifts.length < MAX_SHIFTS && (
                    <button
                      type="button"
                      aria-label={`Añadir otro horario al ${label.toLowerCase()}`}
                      onClick={() => setShifts(i, [...shifts, { ...SEED[shifts.length] }])}
                      className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-[8px] border border-dashed border-[color:var(--color-control)] bg-transparent text-[13px] font-medium text-[color:var(--color-ink-soft)] transition-colors hover:border-[color:var(--color-accent)] hover:bg-[color:var(--color-accent-soft)] hover:text-[color:var(--color-accent-fg)] sm:h-9"
                    >
                      <Plus aria-hidden className="h-3.5 w-3.5" />
                      Añadir otro horario
                    </button>
                  )}

                  <div className="flex flex-wrap items-center gap-1">
                    <CopyFromMenu days={days} current={i} onCopy={source => copyFrom(i, source)} />
                    <Button size="sm" variant="ghost" aria-label={`Poner el horario del ${label.toLowerCase()} en todos los días`} onClick={() => copyToAll(i)}>
                      Poner en todos los días
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p role="status" className="sr-only">{announcement}</p>
    </div>
  );
}

function CopyFromMenu({ days, current, onCopy }: { days: ScheduleValues; current: number; onCopy: (source: number) => void }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button size="sm" variant="ghost">
          <Copy aria-hidden className="h-3.5 w-3.5" />
          Copiar de…
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" sideOffset={4} className="z-[60] min-w-[240px] rounded-[10px] border border-[color:var(--color-border)] bg-white p-1 shadow-[var(--shadow-md)]">
          {days.map((day, i) => i !== current && (
            <DropdownMenu.Item
              key={day.day}
              onSelect={() => onCopy(i)}
              className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-[6px] px-2.5 text-[13.5px] text-[color:var(--color-ink-soft)] outline-none data-[highlighted]:bg-[color:var(--color-surface-2)] data-[highlighted]:text-[color:var(--color-ink)] sm:min-h-9"
            >
              <span>{DAY_LABEL[day.day]}</span>
              <span className="tabular max-w-[150px] truncate text-[12px] text-[color:var(--color-muted)]">{summarize(day.shifts)}</span>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
