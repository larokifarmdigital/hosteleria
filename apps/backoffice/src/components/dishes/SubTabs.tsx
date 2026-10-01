'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
  count: number;
}

interface Props {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (id: string) => void;
}

export function SubTabs({ tabs, defaultTab, onChange }: Props) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id);

  return (
    <div className="mb-5 flex gap-1 border-b border-[color:var(--color-border)]">
      {tabs.map(tab => {
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
              '-mb-px cursor-pointer border-0 border-b-2 border-transparent bg-transparent px-4.5 py-3.5 text-[13.5px] font-semibold transition-colors',
              isActive
                ? 'border-b-[color:var(--color-accent)] text-[color:var(--color-accent)]'
                : 'text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]'
            )}
          >
            {tab.label}
            <span className="tabular ml-1.5 text-[10.5px] font-medium text-[color:var(--color-dim)]">
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
