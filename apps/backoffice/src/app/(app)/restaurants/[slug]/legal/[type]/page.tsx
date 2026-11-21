import { notFound } from 'next/navigation';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { ApiError, type LegalPageType } from '@hosteleria/api-client';
import { getQueryClient } from '@/lib/query/server';
import { getServerApi } from '@/lib/api/server';
import { requireUser } from '@/lib/auth/guards';
import { prefetchLanguages } from '@/lib/query/prefetch';
import { qk } from '@/lib/query/keys';
import { legalPageInfo } from '../legalPages';
import { LegalPageEditorClient } from './LegalPageEditorClient';

interface Props {
  params: Promise<{ slug: string; type: string }>;
}

export const dynamic = 'force-dynamic';

export default async function LegalPageEditorPage({ params }: Props) {
  const { slug, type } = await params;
  await requireUser();
  if (!legalPageInfo(type)) notFound();
  const qc = getQueryClient();
  const api = await getServerApi();

  try {
    await Promise.all([
      prefetchLanguages(qc, api),
      qc.fetchQuery({ queryKey: qk.restaurants.detail(slug), queryFn: () => api.restaurants.get(slug) }),
      qc.fetchQuery({ queryKey: qk.legalPages.byRestaurant(slug), queryFn: () => api.legalPages.list(slug) })
    ]);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) notFound();
    throw err;
  }

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <LegalPageEditorClient slug={slug} type={type as LegalPageType} />
    </HydrationBoundary>
  );
}
