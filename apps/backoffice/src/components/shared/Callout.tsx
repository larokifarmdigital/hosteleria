import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Callout({ title, children, className }: Props) {
  return (
    <div
      className={cn(
        'flex gap-2.5 rounded-[10px] border border-[color:var(--color-border)] border-l-[3px] border-l-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)] p-3.5 text-[12.5px] leading-[1.55] text-[color:var(--color-ink-soft)]',
        className
      )}
    >
      <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-[color:var(--color-accent)]" />
      <div>
        {title && <strong className="mb-1 block text-[13px] font-semibold text-[color:var(--color-ink)]">{title}</strong>}
        {children}
      </div>
    </div>
  );
}
