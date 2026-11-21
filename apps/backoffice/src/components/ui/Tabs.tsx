'use client';

import { useRef } from 'react';
import { cn } from '@/lib/utils';

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
}

/** Pestañas con panel propio: flechas para moverse entre ellas, Tab para entrar en el panel. */
export function TabList({ idPrefix, label, tabs, value, onChange }: TabListProps) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const target =
      e.key === 'ArrowRight' ? tabs[(index + 1) % tabs.length]
      : e.key === 'ArrowLeft' ? tabs[(index - 1 + tabs.length) % tabs.length]
      : e.key === 'Home' ? tabs[0]
      : e.key === 'End' ? tabs[tabs.length - 1]
      : null;
    if (!target) return;
    e.preventDefault();
    onChange(target.id);
    refs.current[target.id]?.focus();
  };

  return (
    <div role="tablist" aria-label={label} className="mb-6 flex flex-wrap gap-1 border-b border-[color:var(--color-border-strong)]">
      {tabs.map((tab, index) => {
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
              '-mb-px inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-t-[10px] border-0 border-b-[3px] bg-transparent px-4 text-[14px] font-semibold leading-none transition-colors',
              selected
                ? 'border-[color:var(--color-accent)] text-[color:var(--color-accent-fg)]'
                : 'border-transparent text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)]'
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
      })}
    </div>
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
