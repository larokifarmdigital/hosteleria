interface Props {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
}

export function KpiTile({ label, value, hint }: Props) {
  return (
    <div className="rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white p-5 shadow-[var(--shadow-sm)]">
      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--color-muted)]">
        {label}
      </p>
      <p className="tabular m-0 text-[30px] font-bold leading-none tracking-[-0.025em] text-[color:var(--color-ink)]">
        {value}
      </p>
      {hint && <p className="m-0 mt-2 text-[12px] text-[color:var(--color-muted)]">{hint}</p>}
    </div>
  );
}
