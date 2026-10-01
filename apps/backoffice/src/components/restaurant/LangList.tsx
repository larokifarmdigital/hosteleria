'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import type { Restaurant } from '@/lib/types';
import { LANGUAGES } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

interface Props {
  restaurant: Restaurant;
}

export function LangList({ restaurant }: Props) {
  const [active, setActive] = useState<string[]>(restaurant.activeLocales);
  const [defaultLocale, setDefaultLocale] = useState(restaurant.defaultLocale);

  const toggle = (code: string) => {
    setActive(prev => (prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]));
  };

  return (
    <div className="flex flex-col gap-0.5">
      {LANGUAGES.map(lang => {
        const isActive = active.includes(lang.code);
        const isDefault = defaultLocale === lang.code;
        return (
          <div
            key={lang.id}
            className={cn(
              'flex items-center gap-2.5 rounded-[10px] border p-2.5 px-3',
              isActive
                ? 'border-[color:var(--color-accent)]/25 bg-[color:var(--color-accent-soft)]'
                : 'border-transparent hover:bg-[color:var(--color-surface-2)]'
            )}
          >
            <button
              type="button"
              onClick={() => toggle(lang.code)}
              aria-label={`Activar ${lang.name}`}
              className={cn(
                'grid h-[18px] w-[18px] flex-shrink-0 place-items-center rounded-[5px] border-[1.5px]',
                isActive
                  ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-white'
                  : 'border-[color:var(--color-border-strong)] bg-white text-transparent'
              )}
            >
              {isActive && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
            </button>
            <div className="flex flex-1 flex-col leading-tight">
              <strong className="text-[13px] font-semibold text-[color:var(--color-ink)]">{lang.name}</strong>
              <span className="slug text-[11px]">{lang.code}</span>
            </div>
            {isActive ? (
              isDefault ? (
                <span
                  className="rounded px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white"
                  style={{ background: 'var(--color-accent)' }}
                >
                  Por defecto
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setDefaultLocale(lang.code)}
                  className="rounded border border-[color:var(--color-border)] bg-transparent px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[color:var(--color-muted)] transition-colors hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
                >
                  Hacer default
                </button>
              )
            ) : (
              <span className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-[color:var(--color-dim)]">
                disponible
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
