import { cn } from '@/lib/utils';

interface Props {
  code: string;
  active?: boolean;
}

export function LocaleChip({ code, active = true }: Props) {
  return (
    <span
      className={cn(
        'rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold uppercase',
        active
          ? 'bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-fg)]'
          : 'border border-dashed border-[color:var(--color-border-strong)] text-[color:var(--color-dim)]'
      )}
    >
      {code}
    </span>
  );
}

export function LocaleChips({ codes, active }: { codes: string[]; active: string[] }) {
  return (
    <span className="inline-flex gap-1">
      {codes.map(c => (
        <LocaleChip key={c} code={c} active={active.includes(c)} />
      ))}
    </span>
  );
}
