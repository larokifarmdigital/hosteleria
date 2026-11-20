'use client';

import { useState } from 'react';
import { DataList } from '@/components/shared/DataList';
import { EmptyState } from '@/components/shared/EmptyState';
import { ReadOnlyNotice } from '@/components/shared/ReadOnlyNotice';
import { Section } from '@/components/shared/Section';
import { StatePill } from '@/components/shared/StatePill';
import { LangList } from '@/components/restaurant/LangList';
import { SpaceCard } from '@/components/restaurant/SpaceCard';
import { LocaleTabs } from '@/components/space/LocaleTabs';
import { formatDate } from '@/lib/utils';
import { useLanguages, useRestaurant, useSpaces } from '@/lib/query/hooks';

export function RestaurantHubPageClient({ slug }: { slug: string }) {
  const { data: restaurant } = useRestaurant(slug);
  const { data: spaces = [] } = useSpaces(slug);
  const { data: languages = [] } = useLanguages();
  const [locale, setLocale] = useState<string | null>(null);

  // Los datos llegan hidratados desde el servidor; esto solo cubre una caché vaciada.
  if (!restaurant) return null;

  const activeLocale = locale ?? restaurant.defaultLocale;
  const localeNames = Object.fromEntries(languages.map(l => [l.code, l.name]));
  const { address, contact, socials, seo } = restaurant;

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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="espacios-titulo">
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

          <Section title="Dirección">
            <DataList
              items={[
                { label: 'Calle', value: address.street },
                { label: 'Código postal', value: address.postalCode },
                { label: 'Ciudad', value: address.city },
                { label: 'Barrio', value: address.district },
                { label: 'Provincia', value: address.province },
                { label: 'País', value: address.country }
              ]}
            />
          </Section>

          <Section title="Contacto y redes">
            <DataList
              items={[
                { label: 'Teléfono', value: contact.phone },
                { label: 'WhatsApp', value: contact.whatsapp },
                { label: 'Email', value: contact.email },
                { label: 'Web', value: contact.web },
                { label: 'Instagram', value: socials.instagram },
                { label: 'Facebook', value: socials.facebook },
                { label: 'TikTok', value: socials.tiktok }
              ]}
            />
          </Section>

          <Section title="Cómo aparece en Google" description="Título y descripción que se ven en los resultados de búsqueda.">
            <LocaleTabs locales={restaurant.activeLocales} value={activeLocale} onChange={setLocale} names={localeNames} />
            <DataList
              items={[
                { label: 'Título', value: seo.title?.[activeLocale], wide: true },
                { label: 'Descripción', value: seo.description?.[activeLocale], wide: true }
              ]}
            />
          </Section>
        </div>

        <aside aria-label="Resumen del restaurante" className="flex flex-col gap-5 self-start lg:sticky lg:top-20">
          <ReadOnlyNotice />

          <Section title="Publicación">
            <DataList
              className="md:grid-cols-1"
              items={[
                { label: 'Última publicación', value: restaurant.lastPublishedAt ? formatDate(restaurant.lastPublishedAt) : 'Sin publicar' },
                { label: 'Reservas online', value: restaurant.acceptsBookings ? 'Activadas' : 'Desactivadas' }
              ]}
            />
          </Section>

          <Section title="Idiomas de la web">
            <LangList restaurant={restaurant} />
          </Section>
        </aside>
      </div>
    </>
  );
}
