'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Pill } from '@/components/shared/Pill';
import { Section } from '@/components/shared/Section';
import { StatePill } from '@/components/shared/StatePill';
import { useLanguages, useRestaurant, useSpaces, useSpace } from '@/lib/query/hooks';
import { SpaceForm } from './SpaceForm';

interface Props {
  slug: string;
  spaceId: string;
}

export function SpaceEditorPageClient({ slug, spaceId }: Props) {
  const { data: restaurant } = useRestaurant(slug);
  const { data: space } = useSpace(slug, spaceId);
  const { data: allSpaces = [] } = useSpaces(slug);
  const { data: languages = [] } = useLanguages();

  // Los datos llegan hidratados desde el servidor; esto solo cubre una caché vaciada.
  if (!restaurant || !space) return null;

  const localeNames = Object.fromEntries(languages.map(l => [l.code, l.name]));
  const siblingSpaces = allSpaces.filter(s => s.id !== space.id);

  return (
    <>
      <Link
        href={`/restaurants/${restaurant.slug}`}
        className="-ml-2 mb-3 inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-[13px] font-semibold text-[color:var(--color-muted)] hover:text-[color:var(--color-accent)]"
      >
        <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
        {restaurant.name}
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h1 className="m-0 text-[22px] font-bold leading-[1.2] tracking-[-0.015em]">{space.name}</h1>
          {space.descriptor && <p className="slug m-0 mt-0.5">{space.descriptor}</p>}
        </div>
        <StatePill state={space.state} />
        {space.isDefault && <Pill variant="accent">Espacio principal</Pill>}
      </div>

      <SpaceForm
        // Otro espacio = otro formulario: sin la key, React reutilizaría los valores del anterior.
        key={space.id}
        restaurant={restaurant}
        space={space}
        localeNames={localeNames}
        aside={
          siblingSpaces.length > 0 && (
            <Section title="Otros espacios">
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {siblingSpaces.map(s => (
                  <li key={s.id}>
                    <Link
                      href={`/restaurants/${restaurant.slug}/spaces/${s.id}`}
                      className="flex min-h-11 items-center justify-between gap-2.5 rounded-lg border border-[color:var(--color-border)] bg-white px-3 text-[13.5px] font-semibold text-[color:var(--color-ink)] transition-colors hover:border-[color:var(--color-copper-300)]"
                    >
                      {s.name}
                      <StatePill state={s.state} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )
        }
      />
    </>
  );
}
