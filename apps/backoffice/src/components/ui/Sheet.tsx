'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  /** Se llama al pedir el cierre (Escape, fondo, botón). Quien lo usa decide si cierra. */
  onRequestClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

/** Panel lateral para editar sin salir de la lista. En móvil ocupa toda la pantalla. */
export function Sheet({ open, onRequestClose, title, description, children }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={next => { if (!next) onRequestClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/45" />
        <Dialog.Content
          className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[520px] flex-col bg-white shadow-[var(--shadow-lg)] focus:outline-none"
        >
          <div className="flex items-start justify-between gap-3 border-b border-[color:var(--color-border)] px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="m-0 text-[18px] font-bold tracking-[-0.01em] text-[color:var(--color-ink)]">{title}</Dialog.Title>
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
                className="grid h-11 w-11 flex-shrink-0 cursor-pointer place-items-center rounded-[10px] border border-[color:var(--color-border-strong)] bg-white text-[color:var(--color-ink)]"
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
  return <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>;
}

export function SheetFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-[color:var(--color-border)] bg-white px-5 py-3.5">
      {children}
    </div>
  );
}
