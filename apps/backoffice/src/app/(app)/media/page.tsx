import { redirect } from 'next/navigation';
import { getServerApi } from '@/lib/api/server';
import { requireUser } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ r?: string; ver?: string }>;
}

// Las fotos son una sección del editor de la web: las direcciones de antes siguen llevando a ella.
export default async function MediaPage({ searchParams }: Props) {
  await requireUser();
  const { r, ver } = await searchParams;
  const restaurants = await (await getServerApi()).restaurants.list().catch(() => []);
  const slug = (restaurants.find(x => x.slug === r) ?? restaurants[0])?.slug;
  if (!slug) redirect('/dashboard');
  redirect(`/restaurants/${slug}?s=media${ver ? `&ver=${encodeURIComponent(ver)}` : ''}`);
}
