import { SYSTEM_SERVICES, REBUILDS } from '@/lib/mock-data';
import { Pill } from '@/components/shared/Pill';

export function SystemStatus() {
  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between gap-3 border-b border-[color:var(--color-border)] px-6 py-5">
        <h3 className="m-0 text-[14.5px] font-bold tracking-[-0.005em]">Estado del sistema</h3>
        <Pill variant="ok" dot>Operativo</Pill>
      </div>

      <div className="flex flex-col px-2 pb-3 pt-2">
        {SYSTEM_SERVICES.map(svc => (
          <div key={svc.id} className="px-4 py-2.5">
            <div className="mb-1 flex items-center gap-2 text-[13.5px] font-semibold text-[color:var(--color-ink)]">
              <span
                className="h-2 w-2 flex-shrink-0 rounded-full"
                style={{
                  background: svc.status === 'ok' ? 'var(--color-ok)' : 'var(--color-warn)',
                  boxShadow: `0 0 0 3px ${svc.status === 'ok' ? 'var(--color-ok-soft)' : 'var(--color-warn-soft)'}`
                }}
              />
              <strong className="font-semibold">{svc.label}</strong>
              {svc.meta && <Pill className="ml-auto">{svc.meta}</Pill>}
            </div>
            {svc.detail && (
              <p className="m-0 ml-4 text-[12px] leading-[1.55] text-[color:var(--color-muted)]">{svc.detail}</p>
            )}
          </div>
        ))}

        <div className="mt-2 border-t border-[color:var(--color-border)] px-4 pb-1.5 pt-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
          Últimos rebuilds (Vercel)
        </div>
        {REBUILDS.map(rb => (
          <div key={rb.id} className="flex items-center gap-2.5 px-4 py-1.5 text-[13px] text-[color:var(--color-ink-soft)]">
            <span
              className="h-2 w-2 flex-shrink-0 rounded-full"
              style={{
                background: rb.status === 'ok' ? 'var(--color-ok)' : 'var(--color-warn)',
                boxShadow: `0 0 0 3px ${rb.status === 'ok' ? 'var(--color-ok-soft)' : 'var(--color-warn-soft)'}`
              }}
            />
            <span>{rb.restaurant}</span>
            <span className="slug ml-auto text-[11.5px]">{rb.relative}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
