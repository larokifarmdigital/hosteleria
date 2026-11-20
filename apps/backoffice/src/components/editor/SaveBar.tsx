'use client';

import { Button } from '@/components/shared/Button';

interface Props {
  dirty: boolean;
  saving: boolean;
  /** Nº de campos con error tras intentar guardar. */
  errorCount: number;
  onDiscard: () => void;
}

/** Barra fija con el estado del formulario. El botón Guardar es el submit del `<form>` que la contiene. */
export function SaveBar({ dirty, saving, errorCount, onDiscard }: Props) {
  if (!dirty && !saving) return null;

  return (
    <div
      role="region"
      aria-label="Cambios sin guardar"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[color:var(--color-border-strong)] bg-white px-4 py-3 shadow-[0_-8px_24px_-12px_rgb(74_36_22/0.25)] lg:left-[var(--sidebar-w)] lg:px-8"
    >
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-[14px] font-semibold text-[color:var(--color-ink)]">
          {errorCount > 0 ? (
            <span className="text-[color:var(--color-danger)]">
              {errorCount === 1 ? 'Hay 1 campo por corregir' : `Hay ${errorCount} campos por corregir`}
            </span>
          ) : (
            'Tienes cambios sin guardar'
          )}
        </p>
        <div className="flex gap-2.5">
          <Button type="button" variant="secondary" disabled={saving} onClick={onDiscard}>
            Deshacer
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
