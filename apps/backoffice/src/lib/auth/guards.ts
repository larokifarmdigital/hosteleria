import 'server-only';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { SessionUser } from '@hosteleria/api-client';
import { getServerApi, getSessionUser } from '@/lib/api/server';
import { loginPath } from './paths';

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(loginPath((await headers()).get('x-pathname')));
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== 'admin') redirect('/');
  return user;
}

/** Un editor con un solo restaurante no necesita inicio ni listado: va directo al suyo. */
export async function redirectEditorToOwnRestaurant(): Promise<void> {
  const user = await requireUser();
  if (user.role !== 'editor') return;
  const restaurants = await (await getServerApi()).restaurants.list();
  if (restaurants.length === 1) redirect(`/restaurants/${restaurants[0].slug}`);
}
