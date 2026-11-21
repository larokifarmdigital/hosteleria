'use client';

import { cn } from '@/lib/utils';

interface Props {
  locales: string[];
  value: string;
  onChange: (code: string) => void;
  /** Nombre visible de cada idioma; si falta, se muestra el código. */
  names?: Record<string, string>;
  /** Nº de textos que faltan por traducir en cada idioma. */
  missing?: Record<string, number>;
}

/** Selector de idioma del contenido. Botones con `aria-pressed`: cambian qué se ve, no son pestañas con panel propio. */
export function LocaleTabs({ locales, value, onChange, names = {}, missing = {} }: Props) {
  return (
    <div role="group" aria-label="Idioma del contenido" className="mb-6 inline-flex flex-wrap gap-1 rounded-[10px] border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-1">
      {locales.map(code => {
        const isActive = code === value;
        const count = missing[code] ?? 0;
        return (
          <button
            key={code}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(code)}
            className={cn(
              'inline-flex min-h-9 items-center gap-2 rounded-md px-4 text-[13px] font-semibold leading-none transition-colors',
              isActive
                ? 'bg-white text-[color:var(--color-accent)] shadow-[var(--shadow-sm)]'
                : 'bg-transparent text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]'
            )}
          >
            {names[code] ?? code.toUpperCase()}
            {count > 0 && (
              <span className="tabular inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[color:var(--color-warn-soft)] px-1 text-[11px] font-bold text-[color:var(--color-warn-fg)]">
                <span aria-hidden>{count}</span>
                <span className="sr-only">{count === 1 ? ', falta 1 texto' : `, faltan ${count} textos`}</span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
