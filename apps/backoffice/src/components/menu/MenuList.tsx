'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { Pill } from '@/components/shared/Pill';
import { missingLocales } from '@/lib/forms/translations';
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
  /** Foto del plato, si tiene. */
  imageUrl?: string;
}

interface Props {
  categories: MenuCategory[];
  /** Idiomas activos, para avisar de categorías sin traducir. */
  locales: string[];
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
  /** Los ids de la categoría en su orden nuevo. */
  onReorderItems: (ids: string[]) => void;
  /** Los ids de las categorías en su orden nuevo. */
  onReorderCategories: (ids: string[]) => void;
}

const ICON_BUTTON =
  'grid h-11 w-11 flex-shrink-0 cursor-pointer place-items-center rounded-[10px] border border-[color:var(--color-border-strong)] bg-white text-[color:var(--color-ink)] transition-colors hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent-fg)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--accent-ring)] disabled:cursor-default disabled:opacity-40 disabled:hover:border-[color:var(--color-border-strong)] disabled:hover:text-[color:var(--color-ink)]';

function moved<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}

/** Tras mover, el botón pulsado puede haber quedado desactivado (primero o último): el foco pasa al otro. */
function keepFocus(prefix: string, pressed: 'up' | 'down') {
  setTimeout(() => {
    const button = document.getElementById(`${prefix}-${pressed}`) as HTMLButtonElement | null;
    if (button && !button.disabled) return button.focus();
    document.getElementById(`${prefix}-${pressed === 'up' ? 'down' : 'up'}`)?.focus();
  }, 0);
}

export function MenuList({ categories, locales, rows, totals, filtering, defaultLocale, itemNoun, onAdd, onEdit, onToggle, onRenameCategory, onDeleteCategory, onReorderItems, onReorderCategories }: Props) {
  const [announcement, setAnnouncement] = useState('');

  const moveCategory = (index: number, to: number, label: string) => {
    onReorderCategories(moved(categories, index, to).map(c => c.id));
    setAnnouncement(`La categoría ${label} pasa a la posición ${to + 1} de ${categories.length}.`);
    keepFocus(`cat-${categories[index].id}`, to < index ? 'up' : 'down');
  };
  const moveItem = (items: MenuRow[], index: number, to: number) => {
    onReorderItems(moved(items, index, to).map(r => r.id));
    setAnnouncement(`${items[index].name} pasa a la posición ${to + 1} de ${items.length}.`);
    keepFocus(`row-${items[index].id}`, to < index ? 'up' : 'down');
  };

  return (
    <div className="flex flex-col gap-6">
      <p role="status" className="sr-only">{announcement}</p>
      {categories.map((category, categoryIndex) => {
        const label = categoryLabel(category, defaultLocale);
        const items = rows.filter(r => r.categoryId === category.id);
        const total = totals[category.id] ?? 0;
        const untranslated = missingLocales(category.name, locales);
        // Con un filtro activo, las categorías sin coincidencias solo estorban.
        if (filtering && items.length === 0) return null;

        return (
          <section key={category.id} aria-labelledby={`cat-${category.id}`} className="rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white shadow-[var(--shadow-sm)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--color-border)] px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <h2 id={`cat-${category.id}`} className="m-0 text-[15px] font-bold tracking-[-0.005em]">
                  {label} <span className="font-normal text-[color:var(--color-muted)]">· {total}</span>
                </h2>
                {untranslated.length > 0 && <Pill variant="warn">Falta traducir: {untranslated.map(c => c.toUpperCase()).join(', ')}</Pill>}
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {/* Con un filtro activo no se ve la lista entera: mover ahí daría un orden que no se entiende. */}
                {!filtering && categories.length > 1 && (
                  <>
                    <button type="button" id={`cat-${category.id}-up`} className={ICON_BUTTON} disabled={categoryIndex === 0} aria-label={`Subir la categoría ${label}`} onClick={() => moveCategory(categoryIndex, categoryIndex - 1, label)}>
                      <ArrowUp aria-hidden className="h-4 w-4" />
                    </button>
                    <button type="button" id={`cat-${category.id}-down`} className={ICON_BUTTON} disabled={categoryIndex === categories.length - 1} aria-label={`Bajar la categoría ${label}`} onClick={() => moveCategory(categoryIndex, categoryIndex + 1, label)}>
                      <ArrowDown aria-hidden className="h-4 w-4" />
                    </button>
                  </>
                )}
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
                {items.map((row, rowIndex) => (
                  <li key={row.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
                    {row.imageUrl && (
                      // Decorativa: el nombre del plato va justo al lado.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.imageUrl} alt="" loading="lazy" decoding="async" className="h-11 w-11 flex-shrink-0 rounded-lg object-cover" />
                    )}
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
                    {!filtering && items.length > 1 && (
                      <div className="flex gap-1.5">
                        <button type="button" id={`row-${row.id}-up`} className={ICON_BUTTON} disabled={rowIndex === 0} aria-label={`Subir: ${row.name}`} onClick={() => moveItem(items, rowIndex, rowIndex - 1)}>
                          <ArrowUp aria-hidden className="h-4 w-4" />
                        </button>
                        <button type="button" id={`row-${row.id}-down`} className={ICON_BUTTON} disabled={rowIndex === items.length - 1} aria-label={`Bajar: ${row.name}`} onClick={() => moveItem(items, rowIndex, rowIndex + 1)}>
                          <ArrowDown aria-hidden className="h-4 w-4" />
                        </button>
                      </div>
                    )}
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
