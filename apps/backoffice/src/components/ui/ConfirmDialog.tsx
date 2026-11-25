'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/shared/Button';
import { useReturnFocus } from './useReturnFocus';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  pendingLabel: string;
  pending: boolean;
  onConfirm: () => void;
  /** A dónde va el foco al cerrar si quien abrió el diálogo ya no existe. */
  returnFocusTo?: () => HTMLElement | null;
}

/** Radix aporta el foco atrapado y Escape; la devolución del foco la pone `useReturnFocus`. */
export function ConfirmDialog({ open, onOpenChange, title, children, confirmLabel, pendingLabel, pending, onConfirm, returnFocusTo }: Props) {
  const returnFocus = useReturnFocus(returnFocusTo);
  return (
    <Dialog.Root open={open} onOpenChange={next => { if (!pending) onOpenChange(next); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgb(42_20_9/0.45)]" />
        <Dialog.Content {...returnFocus} className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white p-5 shadow-[var(--shadow-lg)] focus:outline-none">
          <Dialog.Title className="m-0 text-[17px] font-bold tracking-[-0.015em] text-[color:var(--color-ink)]">
            {title}
          </Dialog.Title>
          <Dialog.Description asChild>
            <div className="mt-3 text-[14px] leading-[1.55] text-[color:var(--color-ink-soft)]">{children}</div>
          </Dialog.Description>
          <div className="mt-6 flex flex-wrap justify-end gap-2.5">
            <Dialog.Close asChild>
              <Button variant="secondary" disabled={pending}>Cancelar</Button>
            </Dialog.Close>
            <Button variant="primary" disabled={pending} onClick={onConfirm}>
              {pending ? pendingLabel : confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
