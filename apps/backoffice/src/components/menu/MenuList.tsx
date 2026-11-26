'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { Pill } from '@/components/shared/Pill';
import { useCardHeading } from '@/components/shared/Section';
import { SWITCH_INPUT } from '@/components/ui/inputs';
import { DragHandle, RowMenu, SortableList, sortableRowClass, useSortableItem } from '@/components/ui/Sortable';
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
  /** Cambiado desde el último «Publicar»: aún no está así en la web. */
  unpublished?: boolean;
  /** El precio que enseña la web ahora, si ha cambiado. */
  pricedBefore?: string;
}

/** Lo que la web enseña y en el backoffice ya no está: se quitará al publicar. */
export interface RemovedMenuRow {
  id: string;
  categoryId: string;
  name: string;
  price: string;
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
  /** Categorías con cambios sin publicar. */
  unpublishedCategories?: Set<string>;
  removed?: RemovedMenuRow[];
  onRestore?: (id: string) => void;
  /** Nivel del título de cada categoría: va debajo del de su carta (Platos, Vinos, Bebidas). */
  categoryHeading?: 'h3' | 'h4';
}

function moved<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}

export function MenuList({ categories, locales, rows, totals, filtering, defaultLocale, itemNoun, onAdd, onEdit, onToggle, onRenameCategory, onDeleteCategory, onReorderItems, onReorderCategories, unpublishedCategories, removed = [], onRestore, categoryHeading }: Props) {
  const contextHeading = useCardHeading();
  const CardHeading = categoryHeading ?? contextHeading;
  const [announcement, setAnnouncement] = useState('');

  const moveCategory = (index: number, to: number, label: string) => {
    onReorderCategories(moved(categories, index, to).map(c => c.id));
    setAnnouncement(`La categoría ${label} pasa a la posición ${to + 1} de ${categories.length}.`);
  };
  const moveItem = (items: MenuRow[], index: number, to: number) => {
    onReorderItems(moved(items, index, to).map(r => r.id));
    setAnnouncement(`${items[index].name} pasa a la posición ${to + 1} de ${items.length}.`);
  };

  return (
    <div className="flex flex-col gap-8">
      <p role="status" className="sr-only">{announcement}</p>
      {categories.map((category, categoryIndex) => {
        const label = categoryLabel(category, defaultLocale);
        const items = rows.filter(r => r.categoryId === category.id);
        const total = totals[category.id] ?? 0;
        const untranslated = missingLocales(category.name, locales);
        // Con un filtro activo, las categorías sin coincidencias solo estorban.
        if (filtering && items.length === 0) return null;
        // Con un filtro activo no se ve la lista entera: mover ahí daría un orden que no se entiende.
        const sortable = !filtering && items.length > 1;
        const canMoveCategory = !filtering && categories.length > 1;

        return (
          <section key={category.id} aria-labelledby={`cat-${category.id}`}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                <CardHeading id={`cat-${category.id}`} className="m-0 text-[15px] font-bold tracking-[-0.01em]">
                  {label} <span className="tabular font-normal text-[color:var(--color-muted)]">· {total}</span>
                </CardHeading>
                {unpublishedCategories?.has(category.id) && <Pill variant="warn" dot>Sin publicar</Pill>}
                {untranslated.length > 0 && <Pill variant="warn">Falta traducir: {untranslated.map(c => c.toUpperCase()).join(', ')}</Pill>}
              </div>
              <div className="flex flex-shrink-0 items-center gap-1">
                <Button size="sm" variant="ghost" aria-label={`Añadir ${itemNoun} a ${label}`} onClick={() => onAdd(category.id)}>
                  <Plus aria-hidden className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Añadir {itemNoun}</span>
                  <span className="sm:hidden">Añadir</span>
                </Button>
                <RowMenu
                  name={`categoría ${label}`}
                  actions={[
                    { label: 'Cambiar nombre', onSelect: () => onRenameCategory(category) },
                    ...(canMoveCategory ? [
                      { label: 'Subir categoría', disabled: categoryIndex === 0, onSelect: () => moveCategory(categoryIndex, categoryIndex - 1, label) },
                      { label: 'Bajar categoría', disabled: categoryIndex === categories.length - 1, onSelect: () => moveCategory(categoryIndex, categoryIndex + 1, label) }
                    ] : []),
                    ...(total === 0 ? [{ label: 'Eliminar categoría', danger: true, separated: true, onSelect: () => onDeleteCategory(category) }] : [])
                  ]}
                />
              </div>
            </div>

            {items.length === 0 ? (
              <button
                type="button"
                onClick={() => onAdd(category.id)}
                className="flex min-h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-dashed border-[color:var(--color-control)] bg-white px-4 text-[13.5px] font-medium text-[color:var(--color-ink-soft)] transition-colors hover:border-[color:var(--color-accent)] hover:bg-[color:var(--color-accent-soft)] hover:text-[color:var(--color-accent-fg)]"
              >
                <Plus aria-hidden className="h-4 w-4" />
                Añade {itemNoun === 'bebida' ? 'la primera' : 'el primer'} {itemNoun} de {label}
              </button>
            ) : (
              <SortableList
                ids={items.map(r => r.id)}
                nameOf={id => items.find(r => r.id === id)?.name ?? ''}
                disabled={!sortable}
                // Al arrastrar, el movimiento ya lo anuncia la propia lista.
                onReorder={ids => onReorderItems(ids)}
              >
                <ul className="m-0 flex list-none flex-col gap-0.5 rounded-[10px] border border-[color:var(--color-border)] bg-white p-1.5 shadow-[var(--shadow-sm)]">
                  {items.map((row, rowIndex) => (
                    <ItemRow
                      key={row.id}
                      row={row}
                      sortable={sortable}
                      onEdit={() => onEdit(row.id)}
                      onToggle={next => onToggle(row.id, next)}
                      onUp={rowIndex > 0 ? () => moveItem(items, rowIndex, rowIndex - 1) : undefined}
                      onDown={rowIndex < items.length - 1 ? () => moveItem(items, rowIndex, rowIndex + 1) : undefined}
                    />
                  ))}
                </ul>
              </SortableList>
            )}
            {!filtering && <RemovedRows rows={removed.filter(r => r.categoryId === category.id)} onRestore={onRestore} />}
          </section>
        );
      })}
      {!filtering && (() => {
        // De categorías que también se han borrado.
        const known = new Set(categories.map(c => c.id));
        const orphans = removed.filter(r => !known.has(r.categoryId));
        return orphans.length > 0 && (
          <section aria-label="De categorías borradas">
            <RemovedRows rows={orphans} onRestore={onRestore} />
          </section>
        );
      })()}
    </div>
  );
}

function RemovedRows({ rows, onRestore }: { rows: RemovedMenuRow[]; onRestore?: (id: string) => void }) {
  if (rows.length === 0) return null;
  return (
    <div className="mt-2 rounded-[10px] border border-dashed border-[color:var(--color-border-strong)] px-3 py-2">
      <p className="m-0 mb-1 text-[13px] font-semibold text-[color:var(--color-warn-fg)]">Se quitará de tu web al publicar</p>
      <ul className="m-0 flex list-none flex-col p-0">
        {rows.map(row => (
          <li key={row.id} className="flex min-h-11 items-center gap-3 text-[14px]">
            <span className="min-w-0 flex-1 truncate text-[color:var(--color-muted)] line-through">{row.name}</span>
            <span className="tabular text-[color:var(--color-muted)] line-through">{row.price}</span>
            {onRestore && (
              <Button size="sm" variant="secondary" aria-label={`Recuperar ${row.name}`} onClick={() => onRestore(row.id)}>Recuperar</Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ItemRow({ row, sortable, onEdit, onToggle, onUp, onDown }: { row: MenuRow; sortable: boolean; onEdit: () => void; onToggle: (next: boolean) => void; onUp?: () => void; onDown?: () => void }) {
  const { container, handle, isDragging } = useSortableItem(row.id);
  return (
    <li ref={container.ref} style={container.style} className={sortableRowClass(isDragging)}>
      {sortable && <DragHandle handle={handle} name={row.name} />}
      {/* Toda la fila abre el plato: nombre, foto y precio se cambian ahí. */}
      <button
        type="button"
        aria-label={`Editar ${row.name}`}
        onClick={onEdit}
        className={cn('flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-[6px] border-0 bg-transparent px-2 py-1 text-left', !sortable && 'sm:pl-2')}
      >
        {row.imageUrl && (
          // Decorativa: el nombre del plato va justo al lado.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.imageUrl} alt="" loading="lazy" decoding="async" className="h-9 w-9 flex-shrink-0 rounded-[6px] object-cover" />
        )}
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className={cn('text-[14px] font-semibold leading-snug', row.active ? 'text-[color:var(--color-ink)]' : 'text-[color:var(--color-muted)]')}>{row.name}</span>
            {row.unpublished && <Pill variant="warn" dot>Sin publicar</Pill>}
          </span>
          {row.detail && <span className="mt-0.5 hidden truncate text-[13px] leading-tight text-[color:var(--color-muted)] sm:block">{row.detail}</span>}
          {row.missing.length > 0 && (
            <span className="mt-0.5 flex items-center gap-1.5 text-[12.5px] font-medium text-[color:var(--color-warn-fg)]">
              <span aria-hidden className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-current" />
              Falta traducir: {row.missing.map(c => c.toUpperCase()).join(', ')}
            </span>
          )}
        </span>
        <span className="flex flex-shrink-0 flex-col items-end">
          <span className={cn('tabular text-right text-[14px] font-semibold', row.active ? 'text-[color:var(--color-ink)]' : 'text-[color:var(--color-muted)]')}>{row.price}</span>
          {row.pricedBefore && <span className="tabular text-[12.5px] text-[color:var(--color-muted)]">Antes: {row.pricedBefore}</span>}
        </span>
      </button>
      <label className="flex min-h-11 flex-shrink-0 cursor-pointer items-center gap-2 pl-1 pr-1 text-[13px] text-[color:var(--color-ink-soft)]">
        <span aria-hidden className="hidden w-[46px] text-right md:inline">{row.active ? 'Visible' : 'Oculto'}</span>
        <input type="checkbox" role="switch" className={SWITCH_INPUT} checked={row.active} aria-label={`Visible en la carta: ${row.name}`} onChange={e => onToggle(e.target.checked)} />
      </label>
      {sortable && (
        <RowMenu
          name={row.name}
          className="sm:hidden"
          actions={[
            { label: 'Subir', disabled: !onUp, onSelect: () => onUp?.() },
            { label: 'Bajar', disabled: !onDown, onSelect: () => onDown?.() }
          ]}
        />
      )}
    </li>
  );
}
