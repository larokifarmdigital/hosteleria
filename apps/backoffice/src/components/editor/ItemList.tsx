'use client';

import { useEffect, useRef, useState } from 'react';
import { useFieldArray, useFormContext, useFormState, useWatch } from 'react-hook-form';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { LocaleTabs } from '@/components/space/LocaleTabs';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { DragHandle, ROW_ICON_BUTTON, RowMenu, SortableList, sortableRowClass, useSortableItem } from '@/components/ui/Sortable';
import { FOCUS_FIELD_EVENT, useEditor } from '@/components/site-editor/EditorContext';
import { cn } from '@/lib/utils';

interface Props {
  /** Ruta de la lista en el formulario, p. ej. `faq.items`. */
  name: string;
  /** Cómo se llama cada elemento cuando aún no tiene texto: «Pregunta 1». */
  itemLabel: (index: number) => string;
  /** Lo que se ve de cada elemento en la lista: su texto principal y, debajo, una línea de detalle. */
  summary: (item: Record<string, unknown>, locale: string) => { title?: string; detail?: string };
  /** Nombre de un elemento, en minúscula y con artículo de género: «pregunta», «ventaja». */
  noun: { singular: string; feminine?: boolean };
  addLabel: string;
  emptyText: string;
  max: number;
  /** Valores de un elemento recién añadido (con su `id`). */
  newItem: () => Record<string, unknown>;
  /** Campo que recibe el foco al abrir un elemento. */
  focusField: (index: number) => string;
  /** Los campos del elemento: se pintan en el diálogo de edición. */
  children: (index: number) => React.ReactNode;
}

/**
 * Lista de elementos de un formulario: cada uno es una fila con su resumen; se edita en un
 * diálogo, se ordena arrastrando y se guarda sola, como el resto del editor.
 */
export function ItemList({ name, itemLabel, summary, noun, addLabel, emptyText, max, newItem, focusField, children }: Props) {
  const { control, setFocus } = useFormContext();
  const { locales, locale, setLocale, localeNames, defaultLocale } = useEditor();
  const { fields, append, remove, move } = useFieldArray({ control, name, keyName: 'key' });
  const values = (useWatch({ control, name }) ?? []) as Record<string, unknown>[];
  const { errors } = useFormState({ control, name });
  const [editing, setEditing] = useState<{ key: string; isNew: boolean } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const addRef = useRef<HTMLButtonElement>(null);
  const domId = name.replace(/\./g, '-');
  const full = fields.length >= max;

  const listErrors = name.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], errors) as unknown[] | undefined;
  const titleOf = (index: number) => summary(values[index] ?? {}, defaultLocale).title?.trim() || itemLabel(index);
  const indexOf = (key: string | null | undefined) => fields.findIndex(f => f.key === key);

  const open = (key: string, isNew = false) => {
    setEditing({ key, isNew });
    // El diálogo tarda un instante en montar sus campos.
    setTimeout(() => { try { setFocus(focusField(indexOf(key) < 0 ? fields.length : indexOf(key))); } catch { /* sin campo que enfocar */ } }, 80);
  };

  const onAdd = () => {
    const item = newItem();
    append(item, { shouldFocus: false });
    setAnnouncement(`${itemLabel(fields.length)}: añadido al final de la lista.`);
    // La clave la pone el formulario al añadir: se abre el último en el siguiente render.
    setTimeout(() => setEditing({ key: '__last__', isNew: true }), 0);
    setTimeout(() => { try { setFocus(focusField(fields.length)); } catch { /* sin campo que enfocar */ } }, 120);
  };

  const onRemove = (index: number) => {
    const label = titleOf(index);
    remove(index);
    setAnnouncement(`${label}: eliminado.`);
    setEditing(null);
    setDeleting(null);
  };

  /** `announce`: al arrastrar ya lo anuncia la propia lista; desde el menú «Subir/Bajar», no. */
  const onMove = (from: number, to: number, announce = true) => {
    const label = titleOf(from);
    move(from, to);
    if (announce) setAnnouncement(`${label} pasa a la posición ${to + 1} de ${fields.length}.`);
  };

  // «Ir al campo» (un error, una traducción pendiente): se abre el elemento que lo contiene.
  useEffect(() => {
    const onFocusField = (event: Event) => {
      const path = (event as CustomEvent<string>).detail;
      if (!path.startsWith(`${name}.`)) return;
      const key = fields[Number(path.slice(name.length + 1).split('.')[0])]?.key;
      if (key) setEditing({ key, isNew: false });
    };
    window.addEventListener(FOCUS_FIELD_EVENT, onFocusField);
    return () => window.removeEventListener(FOCUS_FIELD_EVENT, onFocusField);
  }, [name, fields]);

  /** Al cerrar un diálogo, el foco vuelve a la fila del elemento o, si ya no existe, al botón de añadir. */
  const focusTarget = (key?: string) => () =>
    (key ? document.querySelector<HTMLElement>(`[data-item-key="${domId}-${key}"]`) : null) ?? addRef.current;

  const closeEditor = () => {
    const index = editingIndex;
    const blank = Object.values(summary(values[index] ?? {}, defaultLocale)).every(text => !text?.trim())
      && Object.values(summary(values[index] ?? {}, locale)).every(text => !text?.trim());
    // Un elemento nuevo que se cierra sin escribir nada no se queda en la lista.
    if (editing?.isNew && index >= 0 && blank) return onRemove(index);
    setEditing(null);
  };

  const editingIndex = editing ? (editing.key === '__last__' ? fields.length - 1 : indexOf(editing.key)) : -1;
  const deletingIndex = indexOf(deleting);
  const article = noun.feminine ? 'la' : 'el';

  return (
    <div>
      {fields.length === 0 ? (
        <button
          type="button"
          ref={addRef}
          onClick={onAdd}
          aria-label={addLabel}
          className="flex w-full cursor-pointer flex-col items-center gap-1.5 rounded-[10px] border border-dashed border-[color:var(--color-control)] bg-white px-4 py-8 text-center transition-colors hover:border-[color:var(--color-accent)] hover:bg-[color:var(--color-accent-soft)]"
        >
          <span aria-hidden className="mb-1 grid h-10 w-10 place-items-center rounded-full bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-fg)]"><Plus className="h-5 w-5" /></span>
          <span className="text-[14.5px] font-semibold text-[color:var(--color-ink)]">{addLabel}</span>
          <span className="text-[13px] text-[color:var(--color-muted)]">{emptyText}</span>
        </button>
      ) : (
        <>
          <SortableList ids={fields.map(f => f.key)} nameOf={key => titleOf(indexOf(key))} disabled={fields.length < 2} onReorder={(_, from, to) => onMove(from, to, false)}>
            <ol className="m-0 mb-3 flex list-none flex-col gap-0.5 rounded-[10px] border border-[color:var(--color-border)] bg-white p-1.5 shadow-[var(--shadow-sm)]">
              {fields.map((field, index) => {
                const { title, detail } = summary(values[index] ?? {}, defaultLocale);
                return (
                  <Row
                    key={field.key}
                    id={field.key}
                    domKey={`${domId}-${field.key}`}
                    sortable={fields.length > 1}
                    title={title?.trim()}
                    fallback={`${itemLabel(index)}, sin texto`}
                    detail={detail?.trim()}
                    hasError={!!listErrors?.[index]}
                    name={titleOf(index)}
                    onEdit={() => open(field.key)}
                    onDelete={() => setDeleting(field.key)}
                    onUp={index > 0 ? () => onMove(index, index - 1) : undefined}
                    onDown={index < fields.length - 1 ? () => onMove(index, index + 1) : undefined}
                  />
                );
              })}
            </ol>
          </SortableList>
          {full ? (
            <p className="m-0 text-[13px] text-[color:var(--color-muted)]">Has llegado al máximo de {max}. Elimina {noun.feminine ? 'una' : 'uno'} para añadir {noun.feminine ? 'otra' : 'otro'}.</p>
          ) : (
            <Button ref={addRef} size="sm" onClick={onAdd}>
              <Plus aria-hidden className="h-3.5 w-3.5" />
              {addLabel}
            </Button>
          )}
        </>
      )}
      <p role="status" className="sr-only">{announcement}</p>

      {editingIndex >= 0 && (
        <Modal
          open
          onClose={closeEditor}
          returnFocusTo={focusTarget(fields[editingIndex]?.key)}
          title={editing?.isNew ? `Nuev${noun.feminine ? 'a' : 'o'} ${noun.singular}` : `Editar ${noun.singular}`}
          description="Los cambios se guardan solos."
          footer={
            <>
              <Button variant="ghost" className="mr-auto text-[color:var(--color-danger)] hover:bg-[color:var(--color-danger-soft)] hover:text-[color:var(--color-danger)]" onClick={() => (editing?.isNew ? onRemove(editingIndex) : setDeleting(fields[editingIndex].key))}>
                {editing?.isNew ? 'Descartar' : 'Eliminar'}
              </Button>
              <Button variant="primary" onClick={closeEditor}>Hecho</Button>
            </>
          }
        >
          <LocaleTabs locales={locales} value={locale} onChange={setLocale} names={localeNames} first={defaultLocale} compact />
          {children(editingIndex)}
        </Modal>
      )}

      <ConfirmDialog
        open={deletingIndex >= 0}
        onOpenChange={next => { if (!next) setDeleting(null); }}
        title={`¿Eliminar ${article} ${noun.singular}?`}
        confirmLabel="Sí, eliminar"
        pendingLabel="Eliminando…"
        pending={false}
        onConfirm={() => onRemove(deletingIndex)}
        returnFocusTo={focusTarget()}
      >
        <p className="m-0">Vas a eliminar «{deletingIndex >= 0 ? titleOf(deletingIndex) : ''}». Deja de verse en la web cuando publiques.</p>
      </ConfirmDialog>
    </div>
  );
}

interface RowProps {
  id: string;
  /** Para devolverle el foco al cerrar su diálogo. */
  domKey: string;
  sortable: boolean;
  title?: string;
  fallback: string;
  detail?: string;
  hasError: boolean;
  name: string;
  onEdit: () => void;
  onDelete: () => void;
  onUp?: () => void;
  onDown?: () => void;
}

function Row({ id, domKey, sortable, title, fallback, detail, hasError, name, onEdit, onDelete, onUp, onDown }: RowProps) {
  const { container, handle, isDragging } = useSortableItem(id);
  return (
    <li ref={container.ref} style={container.style} className={sortableRowClass(isDragging)}>
      {sortable && <DragHandle handle={handle} name={name} />}
      <button type="button" data-item-key={domKey} onClick={onEdit} aria-label={`Editar ${name}`} className="flex min-h-11 min-w-0 flex-1 cursor-pointer flex-col justify-center rounded-[6px] border-0 bg-transparent px-2 py-1 text-left">
        <span className={cn('line-clamp-2 text-[14px] font-semibold leading-snug', title ? 'text-[color:var(--color-ink)]' : 'font-medium text-[color:var(--color-muted)]')}>{title || fallback}</span>
        {detail && <span className="mt-0.5 hidden w-full truncate text-[13px] leading-tight text-[color:var(--color-muted)] sm:block">{detail}</span>}
        {hasError && <span className="mt-0.5 text-[12.5px] font-medium text-[color:var(--color-danger)]">Hay un campo por corregir</span>}
      </button>
      <button type="button" tabIndex={-1} aria-hidden onClick={onEdit} className={cn(ROW_ICON_BUTTON, 'hidden sm:grid')}>
        <Pencil className="h-4 w-4" />
      </button>
      <button type="button" aria-label={`Eliminar ${name}`} onClick={onDelete} className={cn(ROW_ICON_BUTTON, 'hidden hover:bg-[color:var(--color-danger-soft)] hover:text-[color:var(--color-danger)] sm:grid')}>
        <Trash2 aria-hidden className="h-4 w-4" />
      </button>
      <RowMenu
        name={name}
        className="sm:hidden"
        actions={[
          { label: 'Editar', onSelect: onEdit },
          ...(sortable ? [{ label: 'Subir', disabled: !onUp, onSelect: () => onUp?.() }, { label: 'Bajar', disabled: !onDown, onSelect: () => onDown?.() }] : []),
          { label: 'Eliminar', danger: true, separated: true, onSelect: onDelete }
        ]}
      />
    </li>
  );
}
