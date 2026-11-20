import { notFound } from 'next/navigation';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { ApiError } from '@hosteleria/api-client';
import { getQueryClient } from '@/lib/query/server';
import { getServerApi } from '@/lib/api';
import { qk } from '@/lib/query/keys';
import { RestaurantHubPageClient } from './RestaurantHubPageClient';

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamic = 'force-dynamic';

export default async function RestaurantHubPage({ params }: Props) {
  const { slug } = await params;
  const qc = getQueryClient();
  const api = await getServerApi();

  // fetchQuery (no prefetch) para que el 404/403 propague a notFound() server-side.
  try {
    await Promise.all([
      qc.fetchQuery({ queryKey: qk.restaurants.detail(slug), queryFn: () => api.restaurants.get(slug) }),
      qc.fetchQuery({ queryKey: qk.spaces.byRestaurant(slug), queryFn: () => api.spaces.list(slug) })
    ]);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) notFound();
    throw err;
  }

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <RestaurantHubPageClient slug={slug} />
    </HydrationBoundary>
  );
}
