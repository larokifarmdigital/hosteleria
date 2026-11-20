import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query/server';
import { getServerApi } from '@/lib/api';
import { prefetchLanguages } from '@/lib/query/hooks/languages';
import { prefetchUsers } from '@/lib/query/hooks/users';
import { prefetchRestaurants } from '@/lib/query/hooks/restaurants';
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
