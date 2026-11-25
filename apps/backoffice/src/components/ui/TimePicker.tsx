'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const pad = (n: number) => String(n).padStart(2, '0');

function parse(value: string): { h: number; m: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value ?? '');
  if (!match) return null;
  return { h: Math.min(23, Number(match[1])), m: Math.min(59, Number(match[2])) };
}

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** Qué hora es: «Lunes, primer horario: abre». */
  label: string;
  invalid?: boolean;
  describedBy?: string;
  minuteStep?: 5 | 10 | 15 | 30;
}

/**
 * Hora en 24 h: un botón con `HH:MM` que abre dos columnas (hora y minutos).
 * Sustituye al campo de hora del navegador, que cambia de formato (AM/PM) según el sistema.
 */
export function TimePicker({ id, value, onChange, label, invalid, describedBy, minuteStep = 15 }: Props) {
  const [open, setOpen] = useState(false);
  const parsed = parse(value);
  const h = parsed?.h ?? 12;
  const m = parsed?.m ?? 0;
  // Una hora guardada con minutos fuera del paso (13:10) se conserva y se puede volver a elegir.
  const minutes = useMemo(() => {
    const list = Array.from({ length: 60 / minuteStep }, (_, i) => i * minuteStep);
    return parsed && !list.includes(parsed.m) ? [...list, parsed.m].sort((a, b) => a - b) : list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minuteStep, parsed?.m]);
  const emit = (hh: number, mm: number) => onChange(`${pad(hh)}:${pad(mm)}`);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          id={id}
          type="button"
          aria-label={`${label}: ${parsed ? `${pad(h)}:${pad(m)}` : 'sin hora'}`}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn(
            'tabular inline-flex h-11 w-[92px] cursor-pointer items-center justify-center rounded-[8px] border border-[color:var(--color-control)] bg-white text-[15px] font-medium text-[color:var(--color-ink)] transition-[border-color,box-shadow] hover:border-[color:var(--color-muted)] sm:h-10 sm:text-[14px]',
            'focus-visible:border-[color:var(--color-accent)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--accent-ring)]',
            'data-[state=open]:border-[color:var(--color-accent)] data-[state=open]:ring-[3px] data-[state=open]:ring-[color:var(--accent-ring)]',
            'aria-[invalid=true]:border-[color:var(--color-danger)]'
          )}
        >
          {parsed ? `${pad(h)}:${pad(m)}` : '--:--'}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          aria-label={`Elegir hora. ${label}`}
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={8}
          onOpenAutoFocus={e => {
            // El foco entra en la hora elegida, no en las 00.
            e.preventDefault();
            const root = e.currentTarget as HTMLElement | null;
            (root?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]') ?? root?.querySelector<HTMLElement>('[role="option"]'))?.focus({ preventScroll: true });
          }}
          className="z-[60] rounded-[10px] border border-[color:var(--color-border)] bg-white p-2 shadow-[var(--shadow-md)]"
        >
          <div className="flex items-stretch gap-2">
            <Column label="Hora" listLabel="Horas" items={HOURS} active={parsed ? h : -1} open={open} onSelect={hh => emit(hh, m)} />
            <div aria-hidden className="w-px bg-[color:var(--color-border)]" />
            {/* Elegir los minutos es el último paso: el selector se cierra. */}
            <Column label="Min" listLabel="Minutos" items={minutes} active={parsed ? m : -1} open={open} onSelect={mm => { emit(h, mm); setOpen(false); }} />
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function Column({ label, listLabel, items, active, open, onSelect }: { label: string; listLabel: string; items: number[]; active: number; open: boolean; onSelect: (value: number) => void }) {
  const activeRef = useRef<HTMLButtonElement>(null);

  // Al abrir, la hora elegida queda centrada en su columna.
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => activeRef.current?.scrollIntoView({ block: 'center' }));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  // Teclado de lista: flechas, Inicio y Fin mueven el foco; Enter o Espacio eligen.
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const options = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]'));
    const current = options.indexOf(document.activeElement as HTMLButtonElement);
    const last = options.length - 1;
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? last : e.key === 'ArrowDown' ? Math.min(last, current + 1) : Math.max(0, current - 1);
    options.forEach((option, i) => { option.tabIndex = i === next ? 0 : -1; });
    options[next].focus();
    options[next].scrollIntoView({ block: 'nearest' });
  };

  return (
    <div className="flex min-w-[56px] flex-col items-center">
      <p aria-hidden className="m-0 select-none py-1 text-center text-[12px] font-medium text-[color:var(--color-muted)]">{label}</p>
      <div role="listbox" aria-label={listLabel} onKeyDown={onKeyDown} className="h-[220px] w-full overflow-y-auto sm:h-[176px]">
        {items.map(n => {
          const selected = n === active;
          return (
            <button
              key={n}
              ref={selected ? activeRef : undefined}
              type="button"
              role="option"
              aria-selected={selected}
              tabIndex={selected || (active < 0 && n === items[0]) ? 0 : -1}
              onClick={() => onSelect(n)}
              className={cn(
                'tabular flex h-11 w-full cursor-pointer items-center justify-center rounded-[6px] border-0 text-[14px] transition-colors sm:h-8 sm:text-[13px]',
                selected ? 'bg-[color:var(--color-accent)] font-semibold text-white' : 'bg-transparent text-[color:var(--color-ink-soft)] hover:bg-[color:var(--color-surface-2)]'
              )}
            >
              {pad(n)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
