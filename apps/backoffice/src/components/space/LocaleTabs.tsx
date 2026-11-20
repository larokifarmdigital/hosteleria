'use client';

import { cn } from '@/lib/utils';

interface Props {
  locales: string[];
  value: string;
  onChange: (code: string) => void;
  /** Nombre visible de cada idioma; si falta, se muestra el código. */
  names?: Record<string, string>;
}

/** Selector de idioma del contenido. Botones con `aria-pressed`: cambian qué se ve, no son pestañas con panel propio. */
export function LocaleTabs({ locales, value, onChange, names = {} }: Props) {
  return (
    <div role="group" aria-label="Idioma del contenido" className="mb-6 inline-flex flex-wrap gap-1 rounded-[10px] border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-1">
      {locales.map(code => {
        const isActive = code === value;
        return (
          <button
            key={code}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(code)}
            className={cn(
              'min-h-9 rounded-md px-4 text-[13px] font-semibold leading-none transition-colors',
              isActive
                ? 'bg-white text-[color:var(--color-accent)] shadow-[var(--shadow-sm)]'
                : 'bg-transparent text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]'
            )}
          >
            {names[code] ?? code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
