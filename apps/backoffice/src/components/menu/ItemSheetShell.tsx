'use client';

import { useState } from 'react';
import { Button } from '@/components/shared/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Sheet, SheetBody, SheetFooter } from '@/components/ui/Sheet';

interface Props {
  title: string;
  dirty: boolean;
  saving: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  /** Solo al editar: nombre de lo que se borraría y la acción. */
  deletion?: { label: string; name: string; pending: boolean; onConfirm: () => Promise<unknown> };
  children: React.ReactNode;
}

/** Marco común de los paneles de plato y vino: formulario, pie con Guardar y borrado con confirmación. */
export function ItemSheetShell({ title, dirty, saving, onSubmit, onClose, deletion, children }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const requestClose = () => {
    if (saving) return;
    if (dirty && !window.confirm('Tienes cambios sin guardar. Si cierras ahora, se perderán. ¿Cerrar de todos modos?')) return;
    onClose();
  };

  return (
    <Sheet open onRequestClose={requestClose} title={title}>
      <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
        <SheetBody>{children}</SheetBody>
        <SheetFooter>
          {deletion ? (
            <Button variant="ghost" className="text-[color:var(--color-danger)] hover:bg-[color:var(--color-danger-soft)] hover:text-[color:var(--color-danger)]" disabled={saving} onClick={() => setConfirmDelete(true)}>
              {deletion.label}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2.5">
            <Button variant="secondary" disabled={saving} onClick={requestClose}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
          </div>
        </SheetFooter>
      </form>

      {deletion && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={`¿Eliminar «${deletion.name}»?`}
          confirmLabel="Sí, eliminar"
          pendingLabel="Eliminando…"
          pending={deletion.pending}
          onConfirm={() => deletion.onConfirm().then(() => setConfirmDelete(false), () => {})}
        >
          <p className="m-0">Desaparecerá de la carta. No se puede deshacer.</p>
        </ConfirmDialog>
      )}
    </Sheet>
  );
}
