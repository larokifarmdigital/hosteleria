interface Props {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  hintTone?: 'default' | 'ok' | 'warn';
}

export function KpiTile({ label, value, hint, hintTone = 'default' }: Props) {
  const hintColor =
    hintTone === 'ok' ? 'var(--color-ok)' : hintTone === 'warn' ? 'var(--color-warn)' : 'var(--color-muted)';

  return (
    <div className="group relative overflow-hidden rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white p-5 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-px hover:shadow-[var(--shadow-md)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-50"
        style={{ background: 'var(--gradient-copper-soft)' }}
      />
      <div className="relative">
        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-muted)]">
          {label}
        </p>
        <p className="tabular m-0 text-[30px] font-bold leading-none tracking-[-0.025em] text-[color:var(--color-ink)]">
          {value}
        </p>
        {hint && (
          <span className="mt-2 inline-flex items-center gap-1 text-[12px]" style={{ color: hintColor }}>
            {hint}
          </span>
        )}
      </div>
    </div>
  );
}
