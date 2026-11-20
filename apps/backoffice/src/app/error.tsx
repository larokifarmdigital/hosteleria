'use client';

// Cubre los fallos del layout de (app), p. ej. si el api no responde al
// validar la sesión: el error.tsx de (app) no captura errores de su propio layout.
export default function RootError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main role="alert" className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <h1 className="m-0 text-[22px] font-bold tracking-[-0.015em]">No hemos podido cargar esta página</h1>
        <p className="mt-2 text-[14px] text-[color:var(--color-muted)]">
          Puede ser un fallo puntual de conexión. Tus datos no se han perdido.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex min-h-11 items-center rounded-full px-6 text-[14px] font-semibold text-white"
          style={{ background: 'var(--gradient-copper)' }}
        >
          Reintentar
        </button>
      </div>
    </main>
  );
}
