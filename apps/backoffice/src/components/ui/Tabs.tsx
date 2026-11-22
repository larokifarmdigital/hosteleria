'use client';

import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { Select } from './inputs';

export interface TabItem {
  id: string;
  label: string;
  /** Nº de textos con traducción pendiente dentro de la pestaña. */
  pending?: number;
  /** Nº de campos con error dentro de la pestaña. */
  errors?: number;
}

interface TabListProps {
  /** Prefijo de los ids: enlaza cada pestaña con su panel. */
  idPrefix: string;
  label: string;
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
  /**
   * Menú lateral: en pantallas anchas las pestañas van en columna, agrupadas bajo
   * estos títulos; en estrechas siguen en una fila que se desplaza.
   */
  groups?: { label: string; ids: string[] }[];
}

/** Pestañas con panel propio: flechas para moverse entre ellas, Tab para entrar en el panel. */
export function TabList({ idPrefix, label, tabs, value, onChange, groups }: TabListProps) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const side = !!groups;

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const target =
      e.key === 'ArrowRight' || e.key === 'ArrowDown' ? tabs[(index + 1) % tabs.length]
      : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? tabs[(index - 1 + tabs.length) % tabs.length]
      : e.key === 'Home' ? tabs[0]
      : e.key === 'End' ? tabs[tabs.length - 1]
      : null;
    if (!target) return;
    e.preventDefault();
    onChange(target.id);
    refs.current[target.id]?.focus();
    refs.current[target.id]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  const tabButton = (tab: TabItem) => {
    const index = tabs.indexOf(tab);
    const selected = tab.id === value;
    return (
      <button
        key={tab.id}
        ref={node => { refs.current[tab.id] = node; }}
        type="button"
        role="tab"
        id={`${idPrefix}-tab-${tab.id}`}
        aria-selected={selected}
        aria-controls={`${idPrefix}-panel-${tab.id}`}
        tabIndex={selected ? 0 : -1}
        onClick={() => onChange(tab.id)}
        onKeyDown={e => onKeyDown(e, index)}
        className={cn(
          '-mb-px inline-flex min-h-11 flex-shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-t-[10px] border-0 border-b-[3px] bg-transparent px-4 text-[14px] font-semibold leading-none transition-colors',
          selected
            ? 'border-[color:var(--color-accent)] text-[color:var(--color-accent-fg)]'
            : 'border-transparent text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)]',
          // En columna: sin subrayado, la activa se marca con fondo.
          side && 'lg:mb-0 lg:w-full lg:justify-between lg:rounded-[10px] lg:border-b-0 lg:px-3 lg:text-left',
          side && (selected ? 'lg:bg-[color:var(--color-accent-soft)]' : 'lg:hover:bg-[color:var(--color-surface-2)]')
        )}
      >
        {tab.label}
        {!!tab.errors && (
          <span className="tabular inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[color:var(--color-danger-soft)] px-1 text-[11px] font-bold text-[color:var(--color-danger)]">
            <span aria-hidden>{tab.errors}</span>
            <span className="sr-only">{tab.errors === 1 ? ', 1 campo por corregir' : `, ${tab.errors} campos por corregir`}</span>
          </span>
        )}
        {!tab.errors && !!tab.pending && (
          <span className="tabular inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[color:var(--color-warn-soft)] px-1 text-[11px] font-bold text-[color:var(--color-warn-fg)]">
            <span aria-hidden>{tab.pending}</span>
            <span className="sr-only">{tab.pending === 1 ? ', falta traducir 1 texto' : `, falta traducir ${tab.pending} textos`}</span>
          </span>
        )}
      </button>
    );
  };

  const note = (tab: TabItem) =>
    tab.errors ? ` (${tab.errors} por corregir)` : tab.pending ? ` (${tab.pending} sin traducir)` : '';

  return (
    <>
    {/* Con menú lateral hay demasiados apartados para una fila: en pantallas estrechas se eligen en un desplegable. */}
    {groups && (
      <div className="mb-5 lg:hidden">
        <label htmlFor={`${idPrefix}-picker`} className="mb-2 block cursor-pointer text-[13px] font-semibold">Apartado</label>
        <Select id={`${idPrefix}-picker`} value={value} onChange={e => onChange(e.target.value)} className="w-full font-semibold">
          {groups.map(group => (
            <optgroup key={group.label} label={group.label}>
              {tabs.filter(tab => group.ids.includes(tab.id)).map(tab => (
                <option key={tab.id} value={tab.id}>{tab.label}{note(tab)}</option>
              ))}
            </optgroup>
          ))}
        </Select>
      </div>
    )}
    {/* En pantallas estrechas las pestañas no caben: se desplazan en horizontal en vez de partirse en dos filas. */}
    <div
      role="tablist"
      aria-label={label}
      aria-orientation={side ? undefined : 'horizontal'}
      className={cn(
        '-mx-1 mb-6 flex gap-1 overflow-x-auto border-b border-[color:var(--color-border-strong)] px-1 pt-1',
        side && 'max-lg:hidden lg:mx-0 lg:mb-0 lg:flex-col lg:gap-5 lg:overflow-visible lg:border-b-0 lg:p-0'
      )}
    >
      {groups
        ? groups.map(group => {
            const items = tabs.filter(tab => group.ids.includes(tab.id));
            if (items.length === 0) return null;
            return (
              // `role="none"`: el grupo solo ordena; para un lector de pantalla las pestañas siguen siendo hijas directas de la lista.
              <div key={group.label} role="none" className="contents lg:flex lg:flex-col lg:gap-0.5">
                <p aria-hidden className="m-0 hidden px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--color-muted)] lg:block">
                  {group.label}
                </p>
                {items.map(tabButton)}
              </div>
            );
          })
        : tabs.map(tabButton)}
    </div>
    </>
  );
}

interface TabPanelProps {
  idPrefix: string;
  id: string;
  active: boolean;
  children: React.ReactNode;
  className?: string;
}

/** El panel inactivo sigue montado (oculto) para que el formulario conserve y valide sus campos. */
export function TabPanel({ idPrefix, id, active, children, className }: TabPanelProps) {
  return (
    <div role="tabpanel" id={`${idPrefix}-panel-${id}`} aria-labelledby={`${idPrefix}-tab-${id}`} hidden={!active} className={className}>
      {children}
    </div>
  );
}
