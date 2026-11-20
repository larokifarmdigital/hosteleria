import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query/server';
import { getServerApi } from '@/lib/api/server';
import { prefetchLanguages } from '@/lib/query/prefetch';
import { prefetchUsers } from '@/lib/query/prefetch';
import { prefetchRestaurants } from '@/lib/query/prefetch';
import { SettingsPageClient } from './SettingsPageClient';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const qc = getQueryClient();
  const api = await getServerApi();
  // users es admin-only — editors reciben 403 pero no debe tirar la page.
  await Promise.all([
    prefetchLanguages(qc, api),
    prefetchUsers(qc, api).catch(() => {}),
    prefetchRestaurants(qc, api)
  ]);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <SettingsPageClient />
    </HydrationBoundary>
  );
}
