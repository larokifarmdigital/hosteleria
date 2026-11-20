'use client';

import { EmptyState } from '@/components/shared/EmptyState';
import { StatePill } from '@/components/shared/StatePill';
import { SpaceCard } from '@/components/restaurant/SpaceCard';
import { useLanguages, useRestaurant, useSpaces } from '@/lib/query/hooks';
import { RestaurantForm } from './RestaurantForm';

export function RestaurantHubPageClient({ slug }: { slug: string }) {
  const { data: restaurant } = useRestaurant(slug);
  const { data: spaces = [] } = useSpaces(slug);
  const { data: languages = [] } = useLanguages();

  // Los datos llegan hidratados desde el servidor; esto solo cubre una caché vaciada.
  if (!restaurant) return null;

  const localeNames = Object.fromEntries(languages.map(l => [l.code, l.name]));

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3.5">
        <div
          aria-hidden
          className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-[14px] text-[17px] font-bold text-white"
          style={{ background: 'var(--gradient-copper)' }}
        >
          {restaurant.logoInitial}
        </div>
        <div className="min-w-0">
          <h1 className="m-0 text-[22px] font-bold leading-[1.2] tracking-[-0.015em]">{restaurant.name}</h1>
          <p className="slug m-0 mt-0.5">{restaurant.domain}</p>
        </div>
        <StatePill state={restaurant.state} />
      </div>

      <section aria-labelledby="espacios-titulo" className="mb-8">
        <h2 id="espacios-titulo" className="mb-1 text-[15px] font-bold tracking-[-0.005em]">
          Espacios
        </h2>
        <p className="mb-3.5 mt-0 text-[13px] text-[color:var(--color-muted)]">
          Cada espacio (sala, terraza, barra…) tiene su propia portada, horarios y carta.
        </p>
        {spaces.length === 0 ? (
          <EmptyState title="Este restaurante aún no tiene espacios" />
        ) : (
          <ul className="m-0 grid list-none grid-cols-1 gap-[18px] p-0 sm:grid-cols-2 xl:grid-cols-3">
            {spaces.map(s => (
              <li key={s.id}>
                <SpaceCard space={s} restaurantSlug={restaurant.slug} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <RestaurantForm key={restaurant.slug} restaurant={restaurant} localeNames={localeNames} />
    </>
  );
}
