interface Props {
  title: string;
  children?: React.ReactNode;
}

export function EmptyState({ title, children }: Props) {
  return (
    <div className="rounded-[var(--radius)] border border-dashed border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-2)] px-6 py-10 text-center">
      <p className="m-0 text-[15px] font-semibold text-[color:var(--color-ink)]">{title}</p>
      {children && <p className="mx-auto mt-1.5 max-w-[46ch] text-[13.5px] text-[color:var(--color-muted)]">{children}</p>}
    </div>
  );
}
