import { redirect } from 'next/navigation';
import { getServerApi } from '@/lib/api/server';
import { requireUser } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ r?: string; e?: string; tipo?: string; ver?: string }>;
}

// La carta es una sección del editor de la web: las direcciones de antes siguen llevando a ella.
export default async function DishesPage({ searchParams }: Props) {
  await requireUser();
  const { r, e, tipo, ver } = await searchParams;
  const restaurants = await (await getServerApi()).restaurants.list().catch(() => []);
  const slug = (restaurants.find(x => x.slug === r) ?? restaurants[0])?.slug;
  if (!slug) redirect('/dashboard');
  const query = new URLSearchParams({ s: 'menu', ...(e ? { e } : {}), ...(tipo ? { tipo } : {}), ...(ver ? { ver } : {}) });
  redirect(`/restaurants/${slug}?${query}`);
}
