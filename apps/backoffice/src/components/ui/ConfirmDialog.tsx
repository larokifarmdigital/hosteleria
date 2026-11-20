'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/shared/Button';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  pendingLabel: string;
  pending: boolean;
  onConfirm: () => void;
}

/** Radix aporta el foco atrapado, Escape y la devolución del foco al cerrar. */
export function ConfirmDialog({ open, onOpenChange, title, children, confirmLabel, pendingLabel, pending, onConfirm }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={next => { if (!pending) onOpenChange(next); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[var(--radius-lg)] bg-white p-6 shadow-[var(--shadow-lg)] focus:outline-none">
          <Dialog.Title className="m-0 text-[18px] font-bold tracking-[-0.01em] text-[color:var(--color-ink)]">
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
