import { cn } from '@/lib/utils';

interface Props {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/** Tarjeta de sección con su `h2`. */
export function Section({ title, description, children, className }: Props) {
  return (
    <section className={cn('rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white shadow-[var(--shadow-sm)]', className)}>
      <div className="border-b border-[color:var(--color-border)] px-6 py-4">
        <h2 className="m-0 text-[15px] font-bold tracking-[-0.005em]">{title}</h2>
        {description && <p className="m-0 mt-1 text-[13px] leading-[1.5] text-[color:var(--color-muted)]">{description}</p>}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}
