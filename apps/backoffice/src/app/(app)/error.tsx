'use client';

import { useEffect } from 'react';
import { Button } from '@/components/shared/Button';
import { reportError } from '@/lib/api';

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error, { digest: error.digest });
  }, [error]);

  return (
    <div role="alert" className="mx-auto max-w-[520px] py-16 text-center">
      <h1 className="m-0 text-[22px] font-bold tracking-[-0.015em]">No hemos podido cargar esta página</h1>
      <p className="mt-2 text-[14px] text-[color:var(--color-muted)]">
        Puede ser un fallo puntual de conexión. Tus datos no se han perdido.
      </p>
      <div className="mt-6 flex justify-center">
        <Button variant="primary" onClick={reset}>Reintentar</Button>
      </div>
    </div>
  );
}
