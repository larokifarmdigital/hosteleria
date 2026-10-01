'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Search, Bell } from 'lucide-react';
import { getRestaurantBySlug, getSpaceById } from '@/lib/mock-data';

interface Crumb {
  label: string;
  href?: string;
}

function buildCrumbs(pathname: string): Crumb[] {
  if (pathname === '/' || pathname === '/dashboard') return [{ label: 'Dashboard' }];
  if (pathname === '/restaurants') return [{ label: 'Contenido', href: '/dashboard' }, { label: 'Restaurantes' }];
  if (pathname === '/dishes') return [{ label: 'Contenido', href: '/dashboard' }, { label: 'Carta' }];
  if (pathname === '/media') return [{ label: 'Contenido', href: '/dashboard' }, { label: 'Media library' }];
  if (pathname === '/settings') return [{ label: 'Sistema', href: '/dashboard' }, { label: 'Ajustes' }];

  // /restaurants/[slug] or /restaurants/[slug]/spaces/[spaceId]
  const restaurantMatch = pathname.match(/^\/restaurants\/([^/]+)(?:\/spaces\/([^/]+))?/);
  if (restaurantMatch) {
    const [, slug, spaceId] = restaurantMatch;
    const restaurant = getRestaurantBySlug(slug);
    const crumbs: Crumb[] = [
      { label: 'Restaurantes', href: '/restaurants' },
      { label: restaurant?.name ?? slug, href: `/restaurants/${slug}` }
    ];
    if (spaceId) {
      const space = getSpaceById(spaceId);
      crumbs.push({ label: space?.name ?? spaceId });
    }
    return crumbs;
  }
  return [{ label: 'Dashboard' }];
}

export function Topbar() {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname);

  return (
    <header
      className="sticky top-0 z-20 flex items-center gap-5 border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-8 py-3.5"
    >
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[13px] font-medium text-[color:var(--color-muted)]">
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-[color:var(--color-dim)]">/</span>}
              {c.href && !isLast ? (
                <Link href={c.href} className="hover:text-[color:var(--color-ink)]">
                  {c.label}
                </Link>
              ) : (
                <strong className="font-semibold text-[color:var(--color-ink)]">{c.label}</strong>
              )}
            </span>
          );
        })}
      </nav>

      <div className="relative ml-auto max-w-[420px] flex-1">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--color-dim)]" />
        <input
          type="search"
          placeholder="Buscar restaurantes, platos, media…"
          className="w-full rounded-[10px] border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] py-2.5 pl-9 pr-16 text-[13px] text-[color:var(--color-ink)] transition-colors focus:border-[color:var(--color-accent)] focus:bg-[color:var(--color-surface)] focus:outline-none focus:ring-[3px] focus:ring-[color:var(--accent-ring)]"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-1.5 py-0.5 text-[10.5px] text-[color:var(--color-muted)]">
          ⌘K
        </span>
      </div>

      <button
        type="button"
        aria-label="Notificaciones"
        className="relative grid h-9 w-9 place-items-center rounded-[10px] border border-[color:var(--color-border)] text-[color:var(--color-muted)] transition-colors hover:border-[color:var(--color-border-strong)] hover:text-[color:var(--color-ink)]"
      >
        <Bell className="h-4 w-4" />
        <span
          className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full border-2 border-[color:var(--color-surface)]"
          style={{ background: 'var(--color-warn)' }}
        />
      </button>
    </header>
  );
}
