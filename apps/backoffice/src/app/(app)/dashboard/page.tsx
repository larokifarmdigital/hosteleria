import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query/server';
import { getServerApi } from '@/lib/api';
import { prefetchRestaurants } from '@/lib/query/hooks/restaurants';
import { DashboardPageClient } from './DashboardPageClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const qc = getQueryClient();
  const api = await getServerApi();
  await prefetchRestaurants(qc, api);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <DashboardPageClient />
    </HydrationBoundary>
  );
}
