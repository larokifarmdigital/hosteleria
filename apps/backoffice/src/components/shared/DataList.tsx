import { cn } from '@/lib/utils';

export interface DataItem {
  label: string;
  value: React.ReactNode;
  /** Ocupa las dos columnas: para textos largos. */
  wide?: boolean;
}

/** Datos en solo lectura. Un valor vacío se muestra como «Sin rellenar», no como hueco. */
export function DataList({ items, className }: { items: DataItem[]; className?: string }) {
  return (
    <dl className={cn('m-0 grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2', className)}>
      {items.map(item => {
        const empty = item.value === null || item.value === undefined || item.value === '';
        return (
          <div key={item.label} className={cn('min-w-0', item.wide && 'md:col-span-2')}>
            <dt className="mb-1 text-[12.5px] font-semibold text-[color:var(--color-muted)]">{item.label}</dt>
            <dd
              className={cn(
                'm-0 whitespace-pre-line break-words text-[14.5px] leading-[1.5]',
                empty ? 'text-[color:var(--color-muted)]' : 'text-[color:var(--color-ink)]'
              )}
            >
              {empty ? 'Sin rellenar' : item.value}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
