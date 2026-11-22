'use client';

import Link from 'next/link';
import { KpiTile } from '@/components/dashboard/KpiTile';
import { RestaurantCard } from '@/components/dashboard/RestaurantCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { QueryBoundary } from '@/components/shared/QueryBoundary';
import { PageHeader } from '@/components/shared/PageHeader';
import { PendingTaskList } from '@/components/tasks/PendingTaskList';
import { useLanguages, usePendingTasksOf, useRestaurants, useSession } from '@/lib/query/hooks';

export function DashboardPageClient() {
  const { data: user } = useSession();
  const restaurantsQuery = useRestaurants();
  const restaurants = restaurantsQuery.data ?? [];

  const published = restaurants.filter(r => r.state === 'published').length;
  const spaces = restaurants.reduce((n, r) => n + r.spacesCount, 0);
  const dishes = restaurants.reduce((n, r) => n + r.dishesCount, 0);
  const wines = restaurants.reduce((n, r) => n + r.winesCount, 0);
  const firstName = user?.name.split(' ')[0];

  const { data: languages = [] } = useLanguages();
  const localeNames = Object.fromEntries(languages.map(l => [l.code as string, l.name]));
  const taskQueries = usePendingTasksOf(restaurants.map(r => r.slug));
  const checking = taskQueries.some(q => q.isPending);
  const failed = taskQueries.some(q => q.isError);
  const pending = restaurants
    .map((restaurant, i) => ({ restaurant, tasks: taskQueries[i]?.data ?? [] }))
    .filter(group => group.tasks.length > 0);
  const total = pending.reduce((n, group) => n + group.tasks.length, 0);

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

          <section aria-labelledby="pendiente-titulo" className="mb-8">
            <h2 id="pendiente-titulo" className="mb-1 text-[15px] font-bold tracking-[-0.005em]">Pendiente</h2>
            <p role="status" className="m-0 mb-3.5 text-[13.5px] text-[color:var(--color-muted)]">
              {checking
                ? 'Comprobando el contenido…'
                : total === 0
                  ? (failed ? 'No se ha podido comprobar el contenido. Recarga la página para intentarlo otra vez.' : 'Todo al día: no falta nada por publicar, traducir ni completar.')
                  : `${total === 1 ? '1 cosa' : `${total} cosas`} por resolver en ${pending.length === 1 ? '1 restaurante' : `${pending.length} restaurantes`}.${failed ? ' Algún restaurante no se ha podido comprobar.' : ''}`}
            </p>
            {pending.length > 0 && (
              <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 lg:grid-cols-2">
                {pending.map(({ restaurant, tasks }) => (
                  <li key={restaurant.id} className="rounded-[var(--radius)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-4">
                    <h3 className="m-0 mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[14px] font-bold">
                      <Link href={`/restaurants/${restaurant.slug}`} className="inline-flex min-h-8 items-center text-[color:var(--color-ink)] underline underline-offset-2">{restaurant.name}</Link>
                      <span className="text-[12.5px] font-medium text-[color:var(--color-muted)]">{tasks.length === 1 ? '1 pendiente' : `${tasks.length} pendientes`}</span>
                    </h3>
                    <PendingTaskList slug={restaurant.slug} tasks={tasks} localeNames={localeNames} />
                  </li>
                ))}
              </ul>
            )}
          </section>

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
