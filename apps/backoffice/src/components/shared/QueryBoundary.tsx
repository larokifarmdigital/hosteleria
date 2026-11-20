'use client';

import type { UseQueryResult } from '@tanstack/react-query';
import { Button } from './Button';

interface Props {
  /** Todas las consultas de las que depende la pantalla. */
  queries: UseQueryResult<unknown>[];
  children: React.ReactNode;
}

/** Sin esto, un fallo de carga se confundiría con «no hay datos» y se pintaría el estado vacío. */
export function QueryBoundary({ queries, children }: Props) {
  const failed = queries.filter(q => q.isError);

  if (failed.length > 0) {
    const retrying = failed.some(q => q.isFetching);
    return (
      <div role="alert" className="rounded-[var(--radius)] border border-[color:var(--color-danger)]/30 bg-[color:var(--color-danger-soft)] px-6 py-8 text-center">
        <p className="m-0 text-[15px] font-semibold text-[color:var(--color-ink)]">No hemos podido cargar los datos</p>
        <p className="mx-auto mt-1.5 max-w-[46ch] text-[13.5px] text-[color:var(--color-ink-soft)]">
          Puede ser un fallo puntual de conexión.
        </p>
        <div className="mt-5 flex justify-center">
          <Button variant="secondary" disabled={retrying} onClick={() => failed.forEach(q => q.refetch())}>
            {retrying ? 'Reintentando…' : 'Reintentar'}
          </Button>
        </div>
      </div>
    );
  }

  if (queries.some(q => q.isPending)) {
    return (
      <div role="status" aria-live="polite">
        <span className="sr-only">Cargando…</span>
        <div aria-hidden className="h-40 animate-pulse rounded-[var(--radius)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] motion-reduce:animate-none" />
      </div>
    );
  }

  return <>{children}</>;
}
