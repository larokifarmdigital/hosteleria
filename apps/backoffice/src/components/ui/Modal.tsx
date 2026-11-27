'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReturnFocus } from './useReturnFocus';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'md' | 'lg';
  /** Pie fijo con las acciones, a la derecha. */
  footer?: React.ReactNode;
  /** A dónde va el foco al cerrar si quien abrió el diálogo ya no existe. */
  returnFocusTo?: () => HTMLElement | null;
  children: React.ReactNode;
}

/** Diálogo con cabecera fija y cuerpo con scroll. En móvil ocupa casi toda la pantalla. */
export function Modal({ open, onClose, title, description, size = 'md', footer, returnFocusTo, children }: Props) {
  const returnFocus = useReturnFocus(returnFocusTo);

  return (
    <Dialog.Root open={open} onOpenChange={next => { if (!next) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgb(28_26_25/0.45)]" />
        <Dialog.Content
          {...returnFocus}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white shadow-[var(--shadow-lg)] focus:outline-none',
            size === 'lg' ? 'max-w-[760px]' : 'max-w-[560px]'
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-[color:var(--color-border)] px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="m-0 text-[17px] font-bold tracking-[-0.015em] text-[color:var(--color-ink)]">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="m-0 mt-1 text-[13px] leading-[1.5] text-[color:var(--color-muted)]">{description}</Dialog.Description>
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
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
          {footer && (
            <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2.5 border-t border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-5 py-3">{footer}</div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
