'use client';

import type { Restaurant } from '@/lib/types';
import { Pill } from '@/components/shared/Pill';
import { useLanguages } from '@/lib/query/hooks';

export function LangList({ restaurant }: { restaurant: Restaurant }) {
  const { data: languages = [] } = useLanguages();
  const nameOf = (code: string) => languages.find(l => l.code === code)?.name ?? code.toUpperCase();

  return (
    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
      {restaurant.activeLocales.map(code => (
        <li key={code} className="flex items-center justify-between gap-2 text-[13.5px] text-[color:var(--color-ink)]">
          <span>{nameOf(code)}</span>
          {code === restaurant.defaultLocale && <Pill variant="accent">Principal</Pill>}
        </li>
      ))}
    </ul>
  );
}
