import Link from 'next/link';
import { PENDING_TASKS } from '@/lib/mock-data';
import { Pill } from '@/components/shared/Pill';

export function PendingTasks() {
  const critical = PENDING_TASKS.filter(t => t.severity === 'critical').length;

  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between gap-3 border-b border-[color:var(--color-border)] px-6 py-5">
        <h3 className="m-0 text-[14.5px] font-bold tracking-[-0.005em]">Tareas pendientes</h3>
        <Pill>{PENDING_TASKS.length} pendientes · {critical} críticas</Pill>
      </div>
      <ul className="m-0 flex list-none flex-col p-0">
        {PENDING_TASKS.map(t => {
          const iconBg = t.severity === 'critical' ? 'var(--color-danger-soft)' : 'var(--color-warn-soft)';
          const iconFg = t.severity === 'critical' ? 'var(--color-danger)' : 'var(--color-warn)';
          const iconGlyph = t.severity === 'critical' ? '✕' : '!';
          return (
            <li
              key={t.id}
              className="flex items-start gap-3 border-b border-[color:var(--color-border)] px-6 py-3.5 last:border-b-0"
            >
              <div
                className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg text-[13px] font-bold"
                style={{ background: iconBg, color: iconFg }}
              >
                {iconGlyph}
              </div>
              <div>
                <strong className="mb-0.5 block text-[13.5px] font-semibold text-[color:var(--color-ink)]">
                  {t.title}
                </strong>
                <span className="block text-[12.5px] leading-[1.5] text-[color:var(--color-muted)]">{t.body}</span>
                <Link
                  href={t.actionHref}
                  className="mt-1 inline-block text-[12px] font-semibold text-[color:var(--color-accent)] hover:underline"
                >
                  {t.actionLabel} →
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
