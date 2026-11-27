'use client';

import Link from 'next/link';
import { useRestaurants, useSession } from '@/lib/query/hooks';
import { AccountMenu } from './AccountMenu';

export interface AppNavLink { href: string; label: string; exact?: boolean }

/** Lo que cada persona puede abrir: un gestor con un solo restaurante va directo a él y no ve listas. */
export function useAppNav(): { home: string; links: AppNavLink[]; admin: boolean; own?: boolean } {
  const { data: user } = useSession();
  const { data: restaurants = [] } = useRestaurants();
  const admin = user?.role === 'admin';
  const own = !admin && restaurants.length === 1 ? restaurants[0] : null;
  if (own) return { home: `/restaurants/${own.slug}`, links: [{ href: `/restaurants/${own.slug}`, label: own.name }], admin, own: true };
  return {
    home: '/dashboard',
    links: [
      { href: '/dashboard', label: 'Inicio', exact: true },
      { href: '/restaurants', label: 'Restaurantes' }
    ],
    admin
  };
}

export function isLinkActive(pathname: string, link: AppNavLink): boolean {
  return link.exact ? pathname === link.href : pathname === link.href || pathname.startsWith(`${link.href}/`);
}

/**
 * Cabecera de toda la app. En escritorio, a dónde ir está en la barra lateral (`AppSidebar`)
 * y aquí solo queda la cuenta; en móvil, la marca y la cuenta (su menú lleva también a dónde ir).
 */
export function AppHeader() {
  const { home } = useAppNav();
  return (
    <header className="sticky top-0 z-30 border-b border-[color:var(--color-border)] bg-white [@media(max-height:500px)]:static">
      <div className="flex h-14 items-center gap-4 px-4 md:px-6 lg:px-8">
        <Link href={home} className="-ml-1.5 flex items-center gap-2.5 rounded-[8px] px-1.5 py-1 lg:hidden">
          <span aria-hidden className="grid h-8 w-8 place-items-center rounded-[8px] bg-[color:var(--color-accent)] text-[13px] font-bold text-white">HS</span>
          <strong className="text-[15.5px] font-bold tracking-[-0.01em] text-[color:var(--color-ink)] max-sm:sr-only">Hosteleria Studio</strong>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
