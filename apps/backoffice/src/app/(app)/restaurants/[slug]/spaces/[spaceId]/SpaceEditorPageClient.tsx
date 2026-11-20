'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { ScheduleDay } from '@hosteleria/api-client';
import { DataList } from '@/components/shared/DataList';
import { Pill } from '@/components/shared/Pill';
import { ReadOnlyNotice } from '@/components/shared/ReadOnlyNotice';
import { Section } from '@/components/shared/Section';
import { StatePill } from '@/components/shared/StatePill';
import { LocaleTabs } from '@/components/space/LocaleTabs';
import { useLanguages, useRestaurant, useSpaces, useSpace } from '@/lib/query/hooks';

interface Props {
  slug: string;
  spaceId: string;
}

const DAY_LABEL: Record<ScheduleDay['day'], string> = {
  Mo: 'Lunes',
  Tu: 'Martes',
  We: 'Miércoles',
  Th: 'Jueves',
  Fr: 'Viernes',
  Sa: 'Sábado',
  Su: 'Domingo'
};

export function SpaceEditorPageClient({ slug, spaceId }: Props) {
  const { data: restaurant } = useRestaurant(slug);
  const { data: space } = useSpace(slug, spaceId);
  const { data: allSpaces = [] } = useSpaces(slug);
  const { data: languages = [] } = useLanguages();
  const [locale, setLocale] = useState<string | null>(null);

  // Los datos llegan hidratados desde el servidor; esto solo cubre una caché vaciada.
  if (!restaurant || !space) return null;

  const activeLocale = locale ?? restaurant.defaultLocale;
  const localeNames = Object.fromEntries(languages.map(l => [l.code, l.name]));
  const siblingSpaces = allSpaces.filter(s => s.id !== space.id);
  const { hero, manifesto } = space;

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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-6">
          <div>
            <LocaleTabs locales={restaurant.activeLocales} value={activeLocale} onChange={setLocale} names={localeNames} />

            <div className="flex flex-col gap-6">
              <Section title="Portada" description="Lo primero que ve quien entra en la web.">
                <DataList
                  items={[
                    { label: 'Título', value: hero.title?.[activeLocale], wide: true },
                    { label: 'Subtítulo', value: hero.subtitle?.[activeLocale], wide: true },
                    { label: 'Texto breve', value: hero.note?.[activeLocale], wide: true },
                    { label: 'Dato a la izquierda', value: hero.metaLeft?.[activeLocale] },
                    { label: 'Dato a la derecha', value: hero.metaRight?.[activeLocale] },
                    { label: 'Texto del botón', value: hero.cta?.[activeLocale] },
                    { label: 'Descripción de la foto', value: hero.imageAlt?.[activeLocale] }
                  ]}
                />
              </Section>

              <Section title="Texto de presentación">
                <DataList
                  items={[
                    { label: 'Antetítulo', value: manifesto.eyebrow?.[activeLocale], wide: true },
                    { label: 'Texto', value: manifesto.text?.[activeLocale], wide: true }
                  ]}
                />
              </Section>
            </div>
          </div>

          <Section title="Horarios">
            {space.schedule.length === 0 ? (
              <p className="m-0 text-[14px] text-[color:var(--color-muted)]">Este espacio aún no tiene horarios.</p>
            ) : (
              <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[14.5px]">
                {space.schedule.map(day => (
                  <div key={day.day} className="contents">
                    <dt className="font-semibold text-[color:var(--color-ink)]">{DAY_LABEL[day.day]}</dt>
                    <dd className={day.shifts.length ? 'tabular m-0 text-[color:var(--color-ink)]' : 'm-0 text-[color:var(--color-muted)]'}>
                      {day.shifts.length ? day.shifts.map(s => `${s.open} – ${s.close}`).join(' · ') : 'Cerrado'}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </Section>
        </div>

        <aside aria-label="Resumen del espacio" className="flex flex-col gap-5 self-start lg:sticky lg:top-20">
          <ReadOnlyNotice />

          {siblingSpaces.length > 0 && (
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
          )}
        </aside>
      </div>
    </>
  );
}
