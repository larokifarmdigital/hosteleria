import { cn } from '@/lib/utils';

export interface Column {
  label: string;
  /** Columna sin título visible (foto, acciones): el nombre queda solo para lectores de pantalla. */
  hidden?: boolean;
}

/** Tabla con scroll horizontal propio para que en móvil no desborde la página.
 *  El contenedor es enfocable para poder desplazarlo con el teclado, y `relative`
 *  para que los `sr-only` (absolute) de dentro no ensanchen el documento. */
export function Table({ caption, columns, children }: { caption: string; columns: Column[]; children: React.ReactNode }) {
  return (
    <div
      role="region"
      aria-label={caption}
      tabIndex={0}
      className="relative overflow-x-auto rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white shadow-[var(--shadow-sm)]"
    >
      <table className="w-full border-collapse text-[13.5px]">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.label}
                scope="col"
                className="whitespace-nowrap border-b border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--color-muted)]"
              >
                {col.hidden ? <span className="sr-only">{col.label}</span> : col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td {...props} className={cn('border-b border-[color:var(--color-border)] px-5 py-3 align-middle', className)} />;
}
