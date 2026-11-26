'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRestaurants, useSession } from '@/lib/query/hooks';
import { cn } from '@/lib/utils';
import { AccountMenu } from './AccountMenu';

export interface AppNavLink { href: string; label: string; exact?: boolean }

/** Lo que cada persona puede abrir: un gestor con un solo restaurante va directo a él y no ve listas. */
export function useAppNav(): { home: string; links: AppNavLink[]; admin: boolean } {
  const { data: user } = useSession();
  const { data: restaurants = [] } = useRestaurants();
  const admin = user?.role === 'admin';
  const own = !admin && restaurants.length === 1 ? restaurants[0] : null;
  if (own) return { home: `/restaurants/${own.slug}`, links: [], admin };
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

/** Cabecera de toda la app: marca, a dónde ir y, a la derecha, Administración y la cuenta. */
export function AppHeader() {
  const pathname = usePathname();
  const { home, links, admin } = useAppNav();
  const linkClass = (active: boolean) => cn(
    'relative inline-flex h-14 items-center px-3 text-[15px] transition-colors',
    "after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-t-[2px] after:content-['']",
    active
      ? 'font-semibold text-[color:var(--color-ink)] after:bg-[color:var(--color-accent)]'
      : 'font-medium text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)] hover:after:bg-[color:var(--color-border-strong)]'
  );

  return (
    <header className="sticky top-0 z-30 border-b border-[color:var(--color-border)] bg-white [@media(max-height:500px)]:static">
      <div className="flex h-14 items-center gap-4 px-4 md:px-6 lg:px-8">
        <Link href={home} className="-ml-1.5 flex items-center gap-2.5 rounded-[8px] px-1.5 py-1">
          <span aria-hidden className="grid h-8 w-8 place-items-center rounded-[8px] bg-[color:var(--color-accent)] text-[13px] font-bold text-white">HS</span>
          <strong className="text-[15.5px] font-bold tracking-[-0.01em] text-[color:var(--color-ink)] max-sm:sr-only">Hosteleria Studio</strong>
        </Link>
        {links.length > 0 && (
          <nav aria-label="Principal" className="ml-2 hidden lg:block">
            <ul className="m-0 flex list-none gap-1 p-0">
              {links.map(link => {
                const active = isLinkActive(pathname, link);
                return (
                  <li key={link.href}>
                    <Link href={link.href} aria-current={active ? 'page' : undefined} className={linkClass(active)}>{link.label}</Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
        <div className="ml-auto flex items-center gap-2">
          {admin && (
            <Link
              href="/settings"
              aria-current={pathname.startsWith('/settings') ? 'page' : undefined}
              className={cn(linkClass(pathname.startsWith('/settings')), 'hidden lg:inline-flex')}
            >
              Administración
            </Link>
          )}
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
