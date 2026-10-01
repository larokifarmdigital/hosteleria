'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  locales: string[];
  defaultLocale?: string;
  missing?: string[];
  onChange?: (code: string) => void;
}

export function LocaleTabs({ locales, defaultLocale, missing = [], onChange }: Props) {
  const [active, setActive] = useState(defaultLocale ?? locales[0]);

  return (
    <div
      role="tablist"
      aria-label="Idiomas"
      className="mb-7 inline-flex gap-1 rounded-[10px] border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-1"
    >
      {locales.map(code => {
        const isActive = code === active;
        const isMissing = missing.includes(code);
        return (
          <button
            key={code}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => {
              setActive(code);
              onChange?.(code);
            }}
            className={cn(
              'rounded-md px-4 py-2 text-[12.5px] font-semibold uppercase tracking-[0.02em] leading-none transition-colors',
              isActive ? 'bg-white text-[color:var(--color-accent)] shadow-[var(--shadow-sm)]' : 'bg-transparent text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]'
            )}
          >
            {code}
            {isMissing && <span className="ml-1 text-[color:var(--color-warn)]">•</span>}
          </button>
        );
      })}
    </div>
  );
}
