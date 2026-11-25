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
  /** Idioma principal: va el primero. */
  first?: string;
  /** Dentro de un diálogo: control segmentado en vez de pestañas con línea. */
  compact?: boolean;
}

/** Selector de idioma del contenido. Botones con `aria-pressed`: cambian qué se ve, no son pestañas con panel propio. */
export function LocaleTabs({ locales, value, onChange, names = {}, missing = {}, first, compact }: Props) {
  // Con un solo idioma no hay nada que elegir.
  if (locales.length < 2) return null;
  const ordered = first ? [...locales].sort((a, b) => Number(b === first) - Number(a === first)) : locales;
  return (
    <div
      role="group"
      aria-label="Idioma del contenido"
      className={cn(
        'mb-6 flex',
        compact
          ? 'gap-1 overflow-x-auto rounded-[10px] bg-[color:var(--color-surface-2)] p-1'
          : 'items-end gap-1 overflow-x-auto border-b border-[color:var(--color-border)]'
      )}
    >
      {ordered.map(code => {
        const isActive = code === value;
        const count = missing[code] ?? 0;
        return (
          <button
            key={code}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(code)}
            className={cn(
              'inline-flex flex-shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap text-[14px] leading-none transition-colors',
              compact
                ? cn('min-h-11 flex-1 justify-center rounded-[7px] border-0 px-3 sm:min-h-9', isActive ? 'bg-white font-semibold text-[color:var(--color-ink)] shadow-[var(--shadow-sm)]' : 'bg-transparent font-medium text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]')
                : cn('-mb-px min-h-11 border-0 border-b-2 bg-transparent px-3 sm:px-4', isActive ? 'border-[color:var(--color-accent)] font-semibold text-[color:var(--color-ink)]' : 'border-transparent font-medium text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]')
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
