export function LocaleChip({ code }: { code: string }) {
  return (
    <span className="rounded-md bg-[color:var(--color-accent-soft)] px-1.5 py-0.5 text-[11px] font-semibold uppercase text-[color:var(--color-accent-fg)]">
      {code}
    </span>
  );
}

export function LocaleChips({ codes }: { codes: string[] }) {
  if (codes.length === 0) return <span className="text-[12.5px] text-[color:var(--color-muted)]">Sin idiomas</span>;
  return (
    <span className="inline-flex flex-wrap gap-1">
      <span className="sr-only">Idiomas: </span>
      {codes.map(c => (
        <LocaleChip key={c} code={c} />
      ))}
    </span>
  );
}
