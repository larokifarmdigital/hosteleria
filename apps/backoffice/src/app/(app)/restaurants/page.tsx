import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query/server';
import { getServerApi } from '@/lib/api/server';
import { redirectEditorToOwnRestaurant } from '@/lib/auth/guards';
import { prefetchRestaurants } from '@/lib/query/prefetch';
import { RestaurantsPageClient } from './RestaurantsPageClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Restaurantes' };

export default async function RestaurantsPage() {
  await redirectEditorToOwnRestaurant();
  const qc = getQueryClient();
  const api = await getServerApi();
  await prefetchRestaurants(qc, api);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <RestaurantsPageClient />
    </HydrationBoundary>
  );
}
