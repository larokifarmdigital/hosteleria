'use client';

import { KpiTile } from '@/components/dashboard/KpiTile';
import { RestaurantCard } from '@/components/dashboard/RestaurantCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { QueryBoundary } from '@/components/shared/QueryBoundary';
import { PageHeader } from '@/components/shared/PageHeader';
import { useRestaurants, useSession } from '@/lib/query/hooks';

export function DashboardPageClient() {
  const { data: user } = useSession();
  const restaurantsQuery = useRestaurants();
  const restaurants = restaurantsQuery.data ?? [];

  const published = restaurants.filter(r => r.state === 'published').length;
  const spaces = restaurants.reduce((n, r) => n + r.spacesCount, 0);
  const dishes = restaurants.reduce((n, r) => n + r.dishesCount, 0);
  const wines = restaurants.reduce((n, r) => n + r.winesCount, 0);
  const firstName = user?.name.split(' ')[0];

  return (
    <>
      <PageHeader title={firstName ? `Hola, ${firstName}` : 'Inicio'}>
        Elige un restaurante para editar su web.
      </PageHeader>

      <QueryBoundary queries={[restaurantsQuery]}>
      {restaurants.length === 0 ? (
        <EmptyState title="Todavía no tienes ningún restaurante asignado">
          Pide a un administrador que te dé acceso al tuyo.
        </EmptyState>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-[18px] lg:grid-cols-4">
            <KpiTile label="Restaurantes" value={restaurants.length} hint={`${published} publicados`} />
            <KpiTile label="Espacios" value={spaces} />
            <KpiTile label="Platos" value={dishes} />
            <KpiTile label="Vinos" value={wines} />
          </div>

          <h2 className="mb-3.5 text-[15px] font-bold tracking-[-0.005em]">Tus restaurantes</h2>
          <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {restaurants.map(r => (
              <li key={r.id}>
                <RestaurantCard restaurant={r} href={`/restaurants/${r.slug}`} />
              </li>
            ))}
          </ul>
        </>
      )}
      </QueryBoundary>
    </>
  );
}
