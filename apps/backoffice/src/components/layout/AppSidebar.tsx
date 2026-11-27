'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, LayoutDashboard, PanelLeftClose, PanelLeftOpen, Settings, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isLinkActive, useAppNav, type AppNavLink } from './AppHeader';

const FOLDED_KEY = 'hs:sidebar-plegada';

/**
 * Barra lateral clara (escritorio): Inicio, Restaurantes y Administración, o el restaurante
 * de quien solo gestiona uno. Se puede plegar a iconos para dar sitio al editor.
 */
export function AppSidebar() {
  const pathname = usePathname();
  const { home, links, admin } = useAppNav();
  const [folded, setFolded] = useState(false);
  // La preferencia se lee ya montado: en el servidor no existe y rompería la hidratación.
  useEffect(() => {
    try { setFolded(localStorage.getItem(FOLDED_KEY) === '1'); } catch { /* sin almacenamiento */ }
  }, []);
  const toggle = () => setFolded(prev => {
    try { localStorage.setItem(FOLDED_KEY, prev ? '0' : '1'); } catch { /* sin almacenamiento */ }
    return !prev;
  });

  const items: (AppNavLink & { icon: LucideIcon })[] = [
    ...links.map(link => ({ ...link, icon: link.href === '/dashboard' ? LayoutDashboard : Building2 })),
    ...(admin ? [{ href: '/settings', label: 'Administración', icon: Settings }] : [])
  ];

  return (
    <aside
      aria-label="Menú de la aplicación"
      className={cn(
        'sticky top-0 hidden h-screen flex-shrink-0 flex-col border-r border-[color:var(--color-border)] bg-white transition-[width] duration-200 motion-reduce:transition-none lg:flex',
        folded ? 'w-[72px]' : 'w-[232px]'
      )}
    >
      <Link href={home} className={cn('flex h-14 flex-shrink-0 items-center gap-2.5 border-b border-[color:var(--color-border)]', folded ? 'justify-center px-0' : 'px-5')}>
        <span aria-hidden className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-[8px] bg-[color:var(--color-accent)] text-[13px] font-bold text-white">HS</span>
        <strong className={cn('truncate text-[15.5px] font-bold tracking-[-0.01em] text-[color:var(--color-ink)]', folded && 'sr-only')}>Hosteleria Studio</strong>
      </Link>

      <nav aria-label="Principal" className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {items.map(({ icon: Icon, ...link }) => {
            const active = isLinkActive(pathname, link);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  title={folded ? link.label : undefined}
                  className={cn(
                    'relative flex min-h-11 items-center gap-3 rounded-[8px] text-[15px] transition-colors',
                    folded ? 'justify-center px-0' : 'px-3',
                    active
                      ? "bg-[color:var(--color-accent-soft)] font-semibold text-[color:var(--color-accent-fg)] before:absolute before:-left-3 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-r-[2px] before:bg-[color:var(--color-accent)] before:content-['']"
                      : 'font-medium text-[color:var(--color-ink-soft)] hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-ink)]'
                  )}
                >
                  <Icon aria-hidden className="h-[18px] w-[18px] flex-shrink-0" />
                  <span className={cn('truncate', folded && 'sr-only')}>{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-[color:var(--color-border)] p-3">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!folded}
          aria-label={folded ? 'Desplegar el menú' : 'Plegar el menú'}
          className={cn(
            'flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-[8px] border-0 bg-transparent text-[14px] font-medium text-[color:var(--color-muted)] hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-ink)]',
            folded ? 'justify-center px-0' : 'px-3'
          )}
        >
          {folded ? <PanelLeftOpen aria-hidden className="h-[18px] w-[18px]" /> : <PanelLeftClose aria-hidden className="h-[18px] w-[18px]" />}
          <span aria-hidden className={cn(folded && 'sr-only')}>Plegar</span>
        </button>
      </div>
    </aside>
  );
}
