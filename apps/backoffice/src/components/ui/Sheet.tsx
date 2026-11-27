'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useReturnFocus } from './useReturnFocus';

interface Props {
  open: boolean;
  /** Se llama al pedir el cierre (Escape, fondo, botón). Quien lo usa decide si cierra. */
  onRequestClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

/** Diálogo centrado para crear o editar un elemento de una lista, con cuerpo con scroll y pie fijo. */
export function Sheet({ open, onRequestClose, title, description, children }: Props) {
  const returnFocus = useReturnFocus();
  return (
    <Dialog.Root open={open} onOpenChange={next => { if (!next) onRequestClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgb(28_26_25/0.45)]" />
        <Dialog.Content
          {...returnFocus}
          className="fixed left-1/2 top-1/2 z-40 flex max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-[580px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white shadow-[var(--shadow-lg)] focus:outline-none"
        >
          <div className="flex items-start justify-between gap-3 border-b border-[color:var(--color-border)] px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="m-0 text-[17px] font-bold tracking-[-0.015em] text-[color:var(--color-ink)]">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="m-0 mt-1 text-[13px] text-[color:var(--color-muted)]">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Cerrar"
                className="-mr-2 -mt-1.5 grid h-11 w-11 flex-shrink-0 cursor-pointer place-items-center rounded-[8px] border-0 bg-transparent text-[color:var(--color-muted)] transition-colors hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-ink)]"
              >
                <X aria-hidden className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Cuerpo con scroll y pie fijo: los botones de guardar quedan siempre a la vista. */
export function SheetBody({ children }: { children: React.ReactNode }) {
  return <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>;
}

export function SheetFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-2.5 border-t border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-5 py-3">
      {children}
    </div>
  );
}
