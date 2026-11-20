import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query/server';
import { getServerApi } from '@/lib/api/server';
import { requireAdmin } from '@/lib/auth/guards';
import { prefetchLanguages, prefetchUsers } from '@/lib/query/prefetch';
import { SettingsPageClient } from './SettingsPageClient';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  await requireAdmin();
  const qc = getQueryClient();
  const api = await getServerApi();
  await Promise.all([prefetchLanguages(qc, api), prefetchUsers(qc, api)]);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <SettingsPageClient />
    </HydrationBoundary>
  );
}
