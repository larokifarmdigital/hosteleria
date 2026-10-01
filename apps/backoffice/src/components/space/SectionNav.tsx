'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface SectionItem {
  id: string;
  label: string;
  count?: string;
  danger?: boolean;
}

const CONTENT_ITEMS: SectionItem[] = [
  { id: 'hero', label: 'Hero' },
  { id: 'manifesto', label: 'Manifiesto' },
  { id: 'about', label: 'Sobre nosotros' },
  { id: 'gallery', label: 'Galería', count: '18' },
  { id: 'schedule', label: 'Horarios', count: '7d' },
  { id: 'groups', label: 'Grupos y eventos' },
  { id: 'dishes', label: 'Carta de platos', count: '28' },
  { id: 'wines', label: 'Carta de vinos', count: '22' }
];

const PUBLISH_ITEMS: SectionItem[] = [
  { id: 'status', label: 'Estado' },
  { id: 'archive', label: 'Archivar espacio', danger: true }
];

export function SectionNav() {
  const [active, setActive] = useState('hero');

  const renderItem = (item: SectionItem) => {
    const isActive = active === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => setActive(item.id)}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13.5px] font-medium transition-colors',
          isActive
            ? 'bg-[color:var(--color-accent-soft)] font-semibold text-[color:var(--color-accent)]'
            : item.danger
              ? 'text-[color:var(--color-danger)] hover:bg-[color:var(--color-danger-soft)]'
              : 'text-[color:var(--color-ink-soft)] hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-ink)]'
        )}
      >
        <span className="flex-1">{item.label}</span>
        {item.count && (
          <span className="tabular text-[10.5px] font-medium text-[color:var(--color-dim)]">{item.count}</span>
        )}
      </button>
    );
  };

  return (
    <nav className="sticky top-20 rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white p-2.5 shadow-[var(--shadow-sm)]">
      <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
        Contenido del espacio
      </div>
      {CONTENT_ITEMS.map(renderItem)}

      <div className="mt-3.5 px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
        Publicación
      </div>
      {PUBLISH_ITEMS.map(renderItem)}
    </nav>
  );
}
