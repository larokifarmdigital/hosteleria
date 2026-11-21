import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query/server';
import { getServerApi } from '@/lib/api/server';
import { requireUser } from '@/lib/auth/guards';
import { prefetchDishes, prefetchLanguages, prefetchSpaces } from '@/lib/query/prefetch';
import { DishesPageClient } from './DishesPageClient';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ r?: string }>;
}

export default async function DishesPage({ searchParams }: Props) {
  await requireUser();
  const { r } = await searchParams;
  const qc = getQueryClient();
  const api = await getServerApi();

  // Mismo criterio que el cliente para elegir restaurante: el de la URL o el primero.
  const restaurants = await api.restaurants.list().catch(() => []);
  const slug = (restaurants.find(x => x.slug === r) ?? restaurants[0])?.slug;

  await Promise.all([
    prefetchLanguages(qc, api),
    ...(slug ? [prefetchSpaces(qc, api, slug), prefetchDishes(qc, api, { restaurantSlug: slug })] : [])
  ]);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <DishesPageClient />
    </HydrationBoundary>
  );
}
