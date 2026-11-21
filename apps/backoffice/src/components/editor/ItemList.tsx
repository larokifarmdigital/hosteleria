'use client';

import { useRef, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/shared/Button';

interface Props {
  /** Ruta de la lista en el formulario, p. ej. `faq.items`. */
  name: string;
  /** Cómo se llama cada elemento: «Pregunta 1». */
  itemLabel: (index: number) => string;
  addLabel: string;
  emptyText: string;
  max: number;
  /** Valores de un elemento recién añadido (con su `id`). */
  newItem: () => Record<string, unknown>;
  /** Campo que recibe el foco al añadir un elemento. */
  focusField: (index: number) => string;
  children: (index: number) => React.ReactNode;
}

const ICON_BUTTON =
  'grid h-11 w-11 flex-shrink-0 cursor-pointer place-items-center rounded-[10px] border border-[color:var(--color-border-strong)] bg-white text-[color:var(--color-ink)] transition-colors hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent-fg)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--accent-ring)] disabled:cursor-default disabled:opacity-40 disabled:hover:border-[color:var(--color-border-strong)] disabled:hover:text-[color:var(--color-ink)]';

/** Lista de elementos que se añaden, se quitan y se reordenan dentro de un formulario. */
export function ItemList({ name, itemLabel, addLabel, emptyText, max, newItem, focusField, children }: Props) {
  const { control, setFocus } = useFormContext();
  const { fields, append, remove, move } = useFieldArray({ control, name, keyName: 'key' });
  const [announcement, setAnnouncement] = useState('');
  const addRef = useRef<HTMLButtonElement>(null);
  const domId = name.replace(/\./g, '-');
  const full = fields.length >= max;

  const focusButton = (index: number, preferred: 'up' | 'down') => {
    // Tras mover, el botón pulsado puede haber quedado desactivado (primero o último).
    setTimeout(() => {
      const other = preferred === 'up' ? 'down' : 'up';
      const button = document.getElementById(`${domId}-${index}-${preferred}`) as HTMLButtonElement | null;
      const target = button && !button.disabled ? button : document.getElementById(`${domId}-${index}-${other}`);
      target?.focus();
    }, 0);
  };

  const onMove = (from: number, to: number) => {
    const label = itemLabel(from);
    move(from, to);
    setAnnouncement(`${label} pasa a la posición ${to + 1} de ${fields.length}.`);
    focusButton(to, to < from ? 'up' : 'down');
  };

  const onRemove = (index: number) => {
    const label = itemLabel(index);
    remove(index);
    setAnnouncement(`${label}: quitado.`);
    setTimeout(() => addRef.current?.focus(), 0);
  };

  const onAdd = () => {
    append(newItem(), { shouldFocus: false });
    const index = fields.length;
    setAnnouncement(`${itemLabel(index)}: añadido.`);
    setTimeout(() => setFocus(focusField(index)), 0);
  };

  return (
    <div>
      {fields.length === 0 ? (
        <p className="m-0 mb-4 text-[13.5px] leading-[1.5] text-[color:var(--color-muted)]">{emptyText}</p>
      ) : (
        <ol className="m-0 mb-4 flex list-none flex-col gap-4 p-0">
          {fields.map((field, index) => {
            const label = itemLabel(index);
            return (
              <li key={field.key}>
                <div role="group" aria-labelledby={`${domId}-${index}-label`} className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <p id={`${domId}-${index}-label`} className="m-0 text-[13.5px] font-bold text-[color:var(--color-ink)]">{label}</p>
                  <div className="flex gap-2">
                    <button type="button" id={`${domId}-${index}-up`} className={ICON_BUTTON} disabled={index === 0} aria-label={`Subir: ${label}`} onClick={() => onMove(index, index - 1)}>
                      <ArrowUp aria-hidden className="h-4 w-4" />
                    </button>
                    <button type="button" id={`${domId}-${index}-down`} className={ICON_BUTTON} disabled={index === fields.length - 1} aria-label={`Bajar: ${label}`} onClick={() => onMove(index, index + 1)}>
                      <ArrowDown aria-hidden className="h-4 w-4" />
                    </button>
                    <button type="button" className={ICON_BUTTON} aria-label={`Quitar: ${label}`} onClick={() => onRemove(index)}>
                      <Trash2 aria-hidden className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {children(index)}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <Button ref={addRef} className="min-h-11" disabled={full} aria-describedby={full ? `${domId}-max` : undefined} onClick={onAdd}>
        <Plus aria-hidden className="h-4 w-4" />
        {addLabel}
      </Button>
      {full && (
        <p id={`${domId}-max`} className="m-0 mt-2 text-[12.5px] text-[color:var(--color-muted)]">No caben más: el máximo son {max}.</p>
      )}
      <p role="status" className="sr-only">{announcement}</p>
    </div>
  );
}
