'use client';

import { useMemo, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FIELD_BASE } from './inputs';

export interface MultiSelectOption {
  value: string;
  label: string;
  /** Grupo en la lista (p. ej. «Comida»). */
  group?: string;
}

interface Props {
  /** Va en el botón que abre la lista: así la etiqueta del campo lo nombra. */
  id: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  /** Nombre de lo que se elige, en plural, para los textos («formas de pago»). */
  noun: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
}

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Elegir varias opciones de una lista: lo elegido se ve como etiquetas (con ✕ para quitar)
 * y la lista se abre con buscador y casillas, agrupada si las opciones tienen grupo.
 */
export function MultiSelect({ id, options, value, onChange, placeholder = 'Elegir…', noun, ...aria }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const labelOf = (v: string) => options.find(o => o.value === v)?.label ?? v;
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
  // Lo elegido, en el orden de la lista (no en el de marcado).
  const selected = options.filter(o => value.includes(o.value));

  const groups = useMemo(() => {
    const q = normalize(query.trim());
    const visible = options.filter(o => !q || normalize(o.label).includes(q));
    const out: { label?: string; options: MultiSelectOption[] }[] = [];
    for (const o of visible) {
      const last = out[out.length - 1];
      if (last && last.label === o.group) last.options.push(o);
      else out.push({ label: o.group, options: [o] });
    }
    return out;
  }, [options, query]);

  return (
    <Popover.Root open={open} onOpenChange={next => { setOpen(next); if (!next) setQuery(''); }}>
    {/* La lista se ancla al campo entero: sale debajo y con su mismo ancho. */}
    <Popover.Anchor asChild>
    <div className={cn(FIELD_BASE, 'flex min-h-11 flex-wrap items-center gap-1.5 px-2 py-1.5 sm:min-h-10')} aria-invalid={aria['aria-invalid']}>
      {selected.map(o => (
        <span key={o.value} className="inline-flex min-h-8 items-center gap-1 rounded-full bg-[color:var(--color-accent-soft)] py-0.5 pl-3 pr-1 text-[14px] font-medium text-[color:var(--color-accent-fg)]">
          {o.label}
          <button
            type="button"
            aria-label={`Quitar ${o.label}`}
            title="Quitar"
            onClick={() => toggle(o.value)}
            className="grid h-7 w-7 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-current hover:bg-white/70"
          >
            <X aria-hidden className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
        <Popover.Trigger
          id={id}
          aria-describedby={[aria['aria-describedby'], `${id}-elegidas`].filter(Boolean).join(' ')}
          className="ml-auto inline-flex min-h-8 flex-1 cursor-pointer items-center justify-between gap-2 rounded-[6px] border-0 bg-transparent px-1.5 text-left text-[14px] text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"
        >
          <span>{selected.length === 0 ? placeholder : `Añadir ${noun}`}</span>
          <ChevronDown aria-hidden className="h-4 w-4 flex-shrink-0" />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            side="bottom"
            sideOffset={6}
            className="z-[80] w-[var(--radix-popper-anchor-width)] max-w-[calc(100vw-24px)] rounded-[10px] border border-[color:var(--color-border)] bg-white shadow-[var(--shadow-md)]"
          >
            <div className="border-b border-[color:var(--color-border)] p-2">
              <div className="relative">
                <Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-muted)]" />
                <input
                  type="search"
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  aria-label={`Buscar ${noun}`}
                  placeholder="Buscar…"
                  className={cn(FIELD_BASE, 'min-h-10 py-1.5 pl-8')}
                />
              </div>
            </div>
            <div className="max-h-[min(320px,var(--radix-popover-content-available-height,320px))] overflow-y-auto p-1.5">
              {groups.length === 0 && <p className="m-0 px-2.5 py-3 text-[14px] text-[color:var(--color-muted)]">Nada coincide.</p>}
              {groups.map((group, gi) => (
                <fieldset key={`${group.label ?? 'sin-grupo'}-${gi}`} className="m-0 border-0 p-0">
                  {group.label && <legend className="px-2.5 pb-1 pt-2 text-[12.5px] font-bold text-[color:var(--color-muted)]">{group.label}</legend>}
                  {group.options.map(o => (
                    <label key={o.value} htmlFor={`${id}-${o.value}`} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[6px] px-2.5 text-[15px] text-[color:var(--color-ink-soft)] hover:bg-[color:var(--color-surface-2)] sm:min-h-9 sm:text-[14px]">
                      <input
                        id={`${id}-${o.value}`}
                        type="checkbox"
                        checked={value.includes(o.value)}
                        onChange={() => toggle(o.value)}
                        className="h-[18px] w-[18px] flex-shrink-0 cursor-pointer"
                        style={{ accentColor: 'var(--color-accent)' }}
                      />
                      {o.label}
                    </label>
                  ))}
                </fieldset>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-[color:var(--color-border)] px-3 py-2">
              <span role="status" className="text-[13px] text-[color:var(--color-muted)]">{value.length === 0 ? 'Ninguna marcada' : `${value.length} marcada${value.length === 1 ? '' : 's'}`}</span>
              <Popover.Close className="inline-flex min-h-9 cursor-pointer items-center rounded-[8px] border-0 bg-[color:var(--color-accent)] px-3.5 text-[14px] font-semibold text-white hover:bg-[color:var(--color-accent-hover)]">
                Listo
              </Popover.Close>
            </div>
          </Popover.Content>
        </Popover.Portal>
      {/* Para lectores de pantalla, lo elegido se dice al llegar al botón. */}
      <span id={`${id}-elegidas`} className="sr-only">{selected.length ? `Marcadas: ${selected.map(o => labelOf(o.value)).join(', ')}.` : 'Ninguna marcada.'}</span>
    </div>
    </Popover.Anchor>
    </Popover.Root>
  );
}
