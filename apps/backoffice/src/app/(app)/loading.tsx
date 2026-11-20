export default function Loading() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Cargando…</span>
      <div aria-hidden className="animate-pulse motion-reduce:animate-none">
        <div className="mb-3 h-7 w-56 rounded-md bg-[color:var(--color-border)]" />
        <div className="mb-8 h-4 w-80 max-w-full rounded-md bg-[color:var(--color-surface-2)]" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-40 rounded-[var(--radius)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)]" />
          ))}
        </div>
      </div>
    </div>
  );
}
