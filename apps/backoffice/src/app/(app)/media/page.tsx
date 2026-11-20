import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query/server';
import { getServerApi } from '@/lib/api/server';
import { prefetchMedia } from '@/lib/query/prefetch';
import { MediaPageClient } from './MediaPageClient';

export const dynamic = 'force-dynamic';

export default async function MediaPage() {
  const qc = getQueryClient();
  const api = await getServerApi();
  await prefetchMedia(qc, api);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <MediaPageClient />
    </HydrationBoundary>
  );
}
