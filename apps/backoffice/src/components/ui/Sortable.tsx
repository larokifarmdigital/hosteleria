'use client';

import { createContext, useContext, useId } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { GripVertical, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ListProps {
  /** Ids en el orden actual. */
  ids: string[];
  /** Nombre de cada elemento, para anunciarlo al moverlo. */
  nameOf: (id: string) => string;
  /** Los ids en su orden nuevo, y de dónde a dónde se ha movido. */
  onReorder: (ids: string[], from: number, to: number) => void;
  /** En cuadrícula (fotos) en vez de en lista. */
  grid?: boolean;
  /** Sin arrastre: con un filtro activo o un solo elemento. */
  disabled?: boolean;
  children: React.ReactNode;
}

const Enabled = createContext(true);

/**
 * Lista que se reordena arrastrando por el asa de cada fila. Con teclado: foco en el asa,
 * Espacio para coger, flechas para mover y Espacio para soltar. En móvil no se arrastra
 * con el dedo (se confunde con el scroll): cada fila ofrece «Subir» y «Bajar» en su menú.
 */
export function SortableList({ ids, nameOf, onReorder, grid, disabled, children }: ListProps) {
  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const position = (id: string | number) => ids.indexOf(String(id)) + 1;

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(ids, from, to), from, to);
  };

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: { draggable: 'Para mover, pulsa Espacio, usa las flechas y pulsa Espacio otra vez para soltar. Escape lo deja donde estaba.' },
        announcements: {
          onDragStart: ({ active }) => `Has cogido ${nameOf(String(active.id))}, en la posición ${position(active.id)} de ${ids.length}.`,
          onDragOver: ({ active, over }) => (over ? `${nameOf(String(active.id))} pasa a la posición ${position(over.id)} de ${ids.length}.` : undefined),
          onDragEnd: ({ active, over }) => (over ? `${nameOf(String(active.id))} queda en la posición ${position(over.id)} de ${ids.length}.` : `${nameOf(String(active.id))} se queda donde estaba.`),
          onDragCancel: ({ active }) => `Has soltado ${nameOf(String(active.id))} sin moverlo.`
        }
      }}
    >
      <SortableContext items={ids} strategy={grid ? rectSortingStrategy : verticalListSortingStrategy} disabled={disabled}>
        <Enabled.Provider value={!disabled}>{children}</Enabled.Provider>
      </SortableContext>
    </DndContext>
  );
}

/** Lo que necesita un elemento para poder arrastrarse: se reparte entre su contenedor y su asa. */
export function useSortableItem(id: string) {
  const enabled = useContext(Enabled);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  return {
    enabled,
    isDragging,
    container: {
      ref: setNodeRef,
      style: { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined, position: 'relative' as const }
    },
    handle: { ref: setActivatorNodeRef, ...attributes, ...listeners }
  };
}

export const ROW_ICON_BUTTON =
  'grid h-11 w-11 flex-shrink-0 cursor-pointer place-items-center rounded-[6px] border-0 bg-transparent text-[color:var(--color-muted)] transition-colors hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--color-accent)] sm:h-8 sm:w-8';

/** Asa de arrastre. Solo en pantallas con ratón; en móvil se mueve desde el menú de la fila. */
export function DragHandle({ handle, name, className }: { handle: ReturnType<typeof useSortableItem>['handle']; name: string; className?: string }) {
  return (
    <button
      type="button"
      {...handle}
      aria-label={`Mover ${name}`}
      className={cn(ROW_ICON_BUTTON, 'hidden touch-none active:cursor-grabbing sm:grid', className)}
    >
      <GripVertical aria-hidden className="h-4 w-4" />
    </button>
  );
}

export interface RowAction {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  danger?: boolean;
  /** Línea de separación antes de esta acción. */
  separated?: boolean;
}

/** Menú «⋯» de una fila: lo que no merece un botón propio. */
export function RowMenu({ name, actions, className }: { name: string; actions: RowAction[]; className?: string }) {
  const visible = actions.filter(Boolean);
  if (visible.length === 0) return null;
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" aria-label={`Más acciones: ${name}`} className={cn(ROW_ICON_BUTTON, className)}>
          <MoreHorizontal aria-hidden className="h-[18px] w-[18px]" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={4} className="z-[60] min-w-[190px] rounded-[10px] border border-[color:var(--color-border)] bg-white p-1 shadow-[var(--shadow-md)]">
          {visible.map(action => (
            <div key={action.label}>
              {action.separated && <DropdownMenu.Separator className="my-1 h-px bg-[color:var(--color-border)]" />}
              <DropdownMenu.Item
                disabled={action.disabled}
                // Tras cerrarse el menú: así el foco ya ha vuelto al botón «⋯» cuando la acción abre un diálogo.
                onSelect={() => setTimeout(action.onSelect, 0)}
                className={cn(
                  'flex min-h-11 cursor-pointer items-center rounded-[6px] px-2.5 text-[14px] outline-none data-[disabled]:cursor-default data-[disabled]:opacity-45 data-[highlighted]:bg-[color:var(--color-surface-2)] sm:min-h-9 sm:text-[13.5px]',
                  action.danger ? 'text-[color:var(--color-danger)] data-[highlighted]:bg-[color:var(--color-danger-soft)]' : 'text-[color:var(--color-ink-soft)] data-[highlighted]:text-[color:var(--color-ink)]'
                )}
              >
                {action.label}
              </DropdownMenu.Item>
            </div>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** Estilo del contenedor de una fila arrastrable. */
export const sortableRowClass = (isDragging: boolean) =>
  cn(
    'flex items-center gap-1 rounded-[8px] border bg-white px-1 py-1.5 transition-[border-color,box-shadow] sm:gap-2 sm:px-2',
    isDragging ? 'border-[color:var(--color-border-strong)] shadow-[var(--shadow-md)]' : 'border-transparent hover:border-[color:var(--color-border)]'
  );
