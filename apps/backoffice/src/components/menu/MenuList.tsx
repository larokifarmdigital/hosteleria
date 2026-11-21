'use client';

import { Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { Pill } from '@/components/shared/Pill';
import { cn } from '@/lib/utils';
import { categoryLabel, type MenuCategory } from './types';

/** Plato o vino reducido a lo que pinta la lista. */
export interface MenuRow {
  id: string;
  categoryId: string;
  name: string;
  detail?: string;
  price: string;
  active: boolean;
  /** Códigos de idioma en los que falta texto. */
  missing: string[];
}

interface Props {
  categories: MenuCategory[];
  rows: MenuRow[];
  /** Nº total de elementos por categoría, sin filtros: decide si se puede borrar. */
  totals: Record<string, number>;
  filtering: boolean;
  defaultLocale: string;
  itemNoun: string;
  onAdd: (categoryId: string) => void;
  onEdit: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
  onRenameCategory: (category: MenuCategory) => void;
  onDeleteCategory: (category: MenuCategory) => void;
}

export function MenuList({ categories, rows, totals, filtering, defaultLocale, itemNoun, onAdd, onEdit, onToggle, onRenameCategory, onDeleteCategory }: Props) {
  return (
    <div className="flex flex-col gap-6">
      {categories.map(category => {
        const label = categoryLabel(category, defaultLocale);
        const items = rows.filter(r => r.categoryId === category.id);
        const total = totals[category.id] ?? 0;
        // Con un filtro activo, las categorías sin coincidencias solo estorban.
        if (filtering && items.length === 0) return null;

        return (
          <section key={category.id} aria-labelledby={`cat-${category.id}`} className="rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white shadow-[var(--shadow-sm)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--color-border)] px-4 py-3 sm:px-5">
              <h2 id={`cat-${category.id}`} className="m-0 text-[15px] font-bold tracking-[-0.005em]">
                {label} <span className="font-normal text-[color:var(--color-muted)]">· {total}</span>
              </h2>
              <div className="flex flex-wrap gap-1">
                <Button size="sm" variant="ghost" aria-label={`Cambiar nombre de ${label}`} onClick={() => onRenameCategory(category)}>
                  Cambiar nombre
                </Button>
                {total === 0 && (
                  <Button size="sm" variant="ghost" aria-label={`Eliminar la categoría ${label}`} onClick={() => onDeleteCategory(category)}>
                    Eliminar
                  </Button>
                )}
              </div>
            </div>

            {items.length > 0 && (
              <ul className="m-0 list-none divide-y divide-[color:var(--color-border)] p-0">
                {items.map(row => (
                  <li key={row.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
                    <div className="min-w-0 flex-[1_1_220px]">
                      <p className={cn('m-0 text-[14.5px] font-semibold', row.active ? 'text-[color:var(--color-ink)]' : 'text-[color:var(--color-muted)]')}>
                        {row.name}
                      </p>
                      {row.detail && <p className="m-0 mt-0.5 line-clamp-2 text-[13px] text-[color:var(--color-muted)]">{row.detail}</p>}
                      {row.missing.length > 0 && (
                        <Pill variant="warn" className="mt-1.5">Falta traducir: {row.missing.map(c => c.toUpperCase()).join(', ')}</Pill>
                      )}
                    </div>
                    <p className="tabular m-0 min-w-[72px] text-[14px] font-semibold text-[color:var(--color-ink)]">{row.price}</p>
                    <VisibleSwitch name={row.name} active={row.active} onChange={next => onToggle(row.id, next)} />
                    <Button size="sm" aria-label={`Editar ${row.name}`} onClick={() => onEdit(row.id)}>
                      <Pencil aria-hidden className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <div className="px-4 py-3 sm:px-5">
              <Button size="sm" variant="ghost" aria-label={`Añadir ${itemNoun} a ${label}`} onClick={() => onAdd(category.id)}>
                <Plus aria-hidden className="h-3.5 w-3.5" />
                Añadir {itemNoun}
              </Button>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function VisibleSwitch({ name, active, onChange }: { name: string; active: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={`Visible en la carta: ${name}`}
      onClick={() => onChange(!active)}
      className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-0 bg-transparent px-1 text-[13px] font-semibold text-[color:var(--color-ink-soft)]"
    >
      <span
        aria-hidden
        className={cn('relative inline-block h-6 w-11 flex-shrink-0 rounded-full transition-colors motion-reduce:transition-none', active ? 'bg-[color:var(--color-ok-fg)]' : 'bg-[color:var(--color-dim)]')}
      >
        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.25)] transition-[left] motion-reduce:transition-none', active ? 'left-[22px]' : 'left-0.5')} />
      </span>
      <span aria-hidden className="w-[52px] text-left">{active ? 'Visible' : 'Oculto'}</span>
    </button>
  );
}
