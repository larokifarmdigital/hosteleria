'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useRestaurants, useSpace } from '@/lib/query/hooks';

interface Crumb {
  label: string;
  href?: string;
}

const SECTION_LABEL: Record<string, string> = {
  '/dashboard': 'Inicio',
  '/restaurants': 'Restaurantes',
  '/dishes': 'Carta',
  '/media': 'Imágenes',
  '/settings': 'Ajustes'
};

export function Topbar() {
  const pathname = usePathname();
  const match = pathname.match(/^\/restaurants\/([^/]+)(?:\/spaces\/([^/]+))?/);
  const slug = match?.[1];
  const spaceId = match?.[2];

  // El nombre sale del listado, que el layout ya trae hidratado; pedir el
  // detalle aquí lanzaría una petición extra antes de que la página lo hidrate.
  const { data: restaurants = [] } = useRestaurants();
  const restaurant = restaurants.find(r => r.slug === slug);
  const { data: space } = useSpace(slug ?? '', spaceId ?? '');

  let crumbs: Crumb[];
  if (slug) {
    crumbs = [
      { label: 'Restaurantes', href: '/restaurants' },
      { label: restaurant?.name ?? slug, href: `/restaurants/${slug}` }
    ];
    if (spaceId) crumbs.push({ label: space?.name ?? 'Espacio' });
  } else {
    crumbs = [{ label: SECTION_LABEL[pathname] ?? 'Inicio' }];
  }

  return (
    <header className="sticky top-0 z-20 flex min-h-14 items-center border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-8">
      <nav aria-label="Ruta de navegación">
        <ol className="m-0 flex list-none items-center gap-2 p-0 text-[13px] font-medium text-[color:var(--color-muted)]">
          {crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <li key={i} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden>/</span>}
                {c.href && !isLast ? (
                  <Link
                    href={c.href}
                    className="-mx-1.5 inline-flex min-h-9 items-center rounded-md px-1.5 hover:text-[color:var(--color-ink)]"
                  >
                    {c.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="font-semibold text-[color:var(--color-ink)]">
                    {c.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </header>
  );
}
