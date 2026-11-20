import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query/server';
import { getServerApi } from '@/lib/api/server';
import { prefetchDishes } from '@/lib/query/prefetch';
import { DishesPageClient } from './DishesPageClient';

export const dynamic = 'force-dynamic';

export default async function DishesPage() {
  const qc = getQueryClient();
  const api = await getServerApi();
  await prefetchDishes(qc, api);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <DishesPageClient />
    </HydrationBoundary>
  );
}
