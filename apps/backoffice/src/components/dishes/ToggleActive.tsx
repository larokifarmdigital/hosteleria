'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  defaultActive?: boolean;
}

export function ToggleActive({ defaultActive = true }: Props) {
  const [on, setOn] = useState(defaultActive);

  return (
    <button
      type="button"
      onClick={() => setOn(v => !v)}
      aria-pressed={on}
      aria-label={on ? 'Activo' : 'Inactivo'}
      className={cn(
        'relative inline-block h-[18px] w-8 rounded-full transition-colors',
        on ? 'bg-[color:var(--color-ok)]' : 'bg-[color:var(--color-border-strong)]'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-[14px] w-[14px] rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.2)] transition-[left]',
          on ? 'left-4' : 'left-0.5'
        )}
      />
    </button>
  );
}
