import { notFound } from 'next/navigation';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { ApiError } from '@hosteleria/api-client';
import { getQueryClient } from '@/lib/query/server';
import { getServerApi } from '@/lib/api/server';
import { qk } from '@/lib/query/keys';
import { SpaceEditorPageClient } from './SpaceEditorPageClient';

interface Props {
  params: Promise<{ slug: string; spaceId: string }>;
}

export const dynamic = 'force-dynamic';

export default async function SpaceEditorPage({ params }: Props) {
  const { slug, spaceId } = await params;
  const qc = getQueryClient();
  const api = await getServerApi();

  try {
    await Promise.all([
      qc.fetchQuery({ queryKey: qk.restaurants.detail(slug), queryFn: () => api.restaurants.get(slug) }),
      qc.fetchQuery({ queryKey: qk.spaces.detail(slug, spaceId), queryFn: () => api.spaces.get(slug, spaceId) }),
      qc.fetchQuery({ queryKey: qk.spaces.byRestaurant(slug), queryFn: () => api.spaces.list(slug) })
    ]);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) notFound();
    throw err;
  }

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <SpaceEditorPageClient slug={slug} spaceId={spaceId} />
    </HydrationBoundary>
  );
}
