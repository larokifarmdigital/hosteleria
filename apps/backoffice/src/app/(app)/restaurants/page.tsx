import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query/server';
import { getServerApi } from '@/lib/api/server';
import { prefetchRestaurants } from '@/lib/query/prefetch';
import { RestaurantsPageClient } from './RestaurantsPageClient';

export const dynamic = 'force-dynamic';

export default async function RestaurantsPage() {
  const qc = getQueryClient();
  const api = await getServerApi();
  await prefetchRestaurants(qc, api);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <RestaurantsPageClient />
    </HydrationBoundary>
  );
}
