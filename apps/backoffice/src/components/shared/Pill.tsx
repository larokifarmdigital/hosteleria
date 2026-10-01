import { cn } from '@/lib/utils';

type PillVariant = 'ok' | 'warn' | 'danger' | 'accent' | 'plain' | 'role';

interface PillProps {
  variant?: PillVariant;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}

const VARIANT: Record<PillVariant, string> = {
  ok:     'bg-[color:var(--color-ok-soft)] text-[color:var(--color-ok)]',
  warn:   'bg-[color:var(--color-warn-soft)] text-[color:var(--color-warn)]',
  danger: 'bg-[color:var(--color-danger-soft)] text-[color:var(--color-danger)]',
  accent: 'bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-fg)]',
  plain:  'bg-[color:var(--color-surface-2)] text-[color:var(--color-muted)] border border-[color:var(--color-border)]',
  role:   'bg-transparent text-[color:var(--color-accent)] border border-[color:var(--color-accent)]'
};

export function Pill({ variant = 'plain', dot, className, children }: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-[0.02em]',
        VARIANT[variant],
        className
      )}
    >
      {dot && <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
