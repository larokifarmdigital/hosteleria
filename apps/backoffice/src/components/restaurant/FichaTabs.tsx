'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export const FICHA_TABS = [
  { id: 'identity', label: 'Identidad' },
  { id: 'contact', label: 'Contacto' },
  { id: 'socials', label: 'Redes' },
  { id: 'ui', label: 'Textos UI' },
  { id: 'seo', label: 'SEO', warn: true },
  { id: 'ai', label: 'IA · resumen' }
];

interface Props {
  onChange?: (id: string) => void;
}

export function FichaTabs({ onChange }: Props) {
  const [active, setActive] = useState('identity');

  return (
    <div className="mb-0 flex gap-1 border-b border-[color:var(--color-border)] px-6">
      {FICHA_TABS.map(tab => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActive(tab.id);
              onChange?.(tab.id);
            }}
            className={cn(
              '-mb-px cursor-pointer border-0 border-b-2 border-transparent bg-transparent px-4.5 py-3.5 font-inherit text-[13.5px] font-semibold transition-colors',
              isActive
                ? 'border-b-[color:var(--color-accent)] text-[color:var(--color-accent)]'
                : tab.warn
                  ? 'text-[color:var(--color-warn)] hover:text-[color:var(--color-warn)]'
                  : 'text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]'
            )}
          >
            {tab.label}
            {tab.warn && !isActive && <span className="ml-1 tabular text-[10.5px] font-medium text-[color:var(--color-warn)]">!</span>}
          </button>
        );
      })}
    </div>
  );
}
