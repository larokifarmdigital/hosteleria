'use client';

import { useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'md' | 'lg';
  children: React.ReactNode;
}

/** Diálogo con cabecera fija y cuerpo con scroll. En móvil ocupa casi toda la pantalla. */
export function Modal({ open, onClose, title, description, size = 'md', children }: Props) {
  const opener = useRef<HTMLElement | null>(null);

  return (
    <Dialog.Root open={open} onOpenChange={next => { if (!next) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45" />
        <Dialog.Content
          // Radix solo devuelve el foco a un `Dialog.Trigger`, y estos diálogos se
          // abren desde botones normales: se guarda quién lo abrió y se le devuelve.
          onOpenAutoFocus={() => { opener.current = document.activeElement as HTMLElement | null; }}
          onCloseAutoFocus={e => {
            e.preventDefault();
            (opener.current?.isConnected ? opener.current : document.getElementById('contenido'))?.focus();
          }}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-[var(--radius-lg)] bg-white shadow-[var(--shadow-lg)] focus:outline-none',
            size === 'lg' ? 'max-w-[760px]' : 'max-w-[520px]'
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-[color:var(--color-border)] px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="m-0 text-[18px] font-bold tracking-[-0.01em] text-[color:var(--color-ink)]">{title}</Dialog.Title>
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
                className="grid h-11 w-11 flex-shrink-0 cursor-pointer place-items-center rounded-[10px] border border-[color:var(--color-border-strong)] bg-white text-[color:var(--color-ink)]"
              >
                <X aria-hidden className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
