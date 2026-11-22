'use client';

import { LinkButton } from '@/components/shared/Button';
import { StatePill } from '@/components/shared/StatePill';
import { SpacesSection } from '@/components/restaurant/SpacesSection';
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
        {/* Atajos a lo demás que se edita de este restaurante. */}
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <LinkButton href={`/dishes?r=${restaurant.slug}`}>Carta</LinkButton>
          <LinkButton href={`/media?r=${restaurant.slug}`}>Imágenes</LinkButton>
        </div>
      </div>

      <SpacesSection restaurant={restaurant} spaces={spaces} />

      <h2 className="mb-3.5 text-[15px] font-bold tracking-[-0.005em]">Ficha del restaurante</h2>
      {/* Otros idiomas = otros campos: el formulario se monta de nuevo. */}
      <RestaurantForm key={`${restaurant.slug}:${restaurant.activeLocales.join(',')}:${restaurant.defaultLocale}`} restaurant={restaurant} localeNames={localeNames} />
    </>
  );
}
