'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Plus } from 'lucide-react';
import { AddRestaurantDialog } from '@/components/restaurant/AddRestaurantDialog';
import { Button } from '@/components/shared/Button';
import { EmptyState } from '@/components/shared/EmptyState';
import { LocaleChips } from '@/components/shared/LocaleChip';
import { QueryBoundary } from '@/components/shared/QueryBoundary';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatePill } from '@/components/shared/StatePill';
import { Table, Td } from '@/components/shared/Table';
import { formatDate } from '@/lib/utils';
import { useRestaurants, useSession } from '@/lib/query/hooks';

const COLUMNS = [
  { label: 'Restaurante' },
  { label: 'Idiomas' },
  { label: 'Espacios' },
  { label: 'Carta' },
  { label: 'Estado' },
  { label: 'Última publicación' },
  { label: 'Acciones', hidden: true }
];

export function RestaurantsPageClient() {
  const restaurantsQuery = useRestaurants();
  const restaurants = restaurantsQuery.data ?? [];
  const { data: user } = useSession();
  const [adding, setAdding] = useState(false);

  return (
    <>
      <PageHeader title="Restaurantes">Cada restaurante tiene su propia web.</PageHeader>
      {user?.role === 'admin' && (
        <div className="-mt-2 mb-5">
          <Button onClick={() => setAdding(true)}>
            <Plus aria-hidden className="h-4 w-4" />
            Añadir restaurante
          </Button>
        </div>
      )}
      {adding && <AddRestaurantDialog takenSlugs={restaurants.map(r => r.slug)} onClose={() => setAdding(false)} />}

      <QueryBoundary queries={[restaurantsQuery]}>
      {restaurants.length === 0 ? (
        <EmptyState title="Todavía no tienes ningún restaurante asignado">
          Pide a un administrador que te dé acceso al tuyo.
        </EmptyState>
      ) : (
        <Table caption="Restaurantes" columns={COLUMNS}>
          {restaurants.map(r => (
            <tr key={r.id}>
              <Td>
                <div className="flex items-center gap-3">
                  <div aria-hidden className="h-10 w-10 flex-shrink-0 rounded-md" style={{ background: r.coverGradient }} />
                  <div className="min-w-0">
                    <strong className="block whitespace-nowrap font-semibold text-[color:var(--color-ink)]">{r.name}</strong>
                    <span className="slug block whitespace-nowrap">{r.domain}</span>
                  </div>
                </div>
              </Td>
              <Td><LocaleChips codes={r.activeLocales} nowrap /></Td>
              <Td className="tabular text-[color:var(--color-ink-soft)]">{r.spacesCount}</Td>
              <Td className="whitespace-nowrap text-[color:var(--color-ink-soft)]">
                {r.dishesCount} platos · {r.winesCount} vinos{r.drinksCount > 0 ? ` · ${r.drinksCount} bebidas` : ''}
              </Td>
              <Td><StatePill state={r.state} /></Td>
              <Td className="slug">{r.lastPublishedAt ? formatDate(r.lastPublishedAt) : 'Sin publicar'}</Td>
              <Td>
                <Link
                  href={`/restaurants/${r.slug}`}
                  aria-label={`Abrir ${r.name}`}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-[color:var(--color-accent)] hover:bg-[color:var(--color-accent-soft)]"
                >
                  Abrir
                  <ArrowRight aria-hidden className="h-3.5 w-3.5" />
                </Link>
              </Td>
            </tr>
          ))}
        </Table>
      )}
      </QueryBoundary>
    </>
  );
}
