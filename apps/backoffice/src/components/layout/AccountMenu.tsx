'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTransition } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, CircleHelp, KeyRound, LogOut, UserRound } from 'lucide-react';
import type { SessionUser } from '@hosteleria/api-client';
import { logoutAction } from '@/lib/actions';
import { useSession } from '@/lib/query/hooks';
import { cn } from '@/lib/utils';
import { isLinkActive, useAppNav } from './AppHeader';

const ROLE_LABEL: Record<SessionUser['role'], string> = { admin: 'Administrador', editor: 'Gestor' };
/** Ayuda y soporte: escribe al equipo que mantiene el backoffice. */
const SUPPORT_EMAIL = 'pinedacuevaerick910@gmail.com';
const SUPPORT_HREF = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Ayuda con Hosteleria Studio')}`;

function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]!.toUpperCase()).join('');
}

const ITEM = 'flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[8px] px-3 text-[15px] text-[color:var(--color-ink-soft)] no-underline outline-none data-[highlighted]:bg-[color:var(--color-surface-2)] data-[highlighted]:text-[color:var(--color-ink)] lg:min-h-10';
const ICON = 'h-[18px] w-[18px] flex-shrink-0 text-[color:var(--color-muted)]';

/** El avatar de la cabecera y su menú: la cuenta de cada uno, la ayuda y salir. En móvil lleva también a dónde ir. */
export function AccountMenu() {
  const { data: user } = useSession();
  const pathname = usePathname();
  const { links, admin } = useAppNav();
  const [leaving, startLeaving] = useTransition();
  if (!user) return null;
  const mobileLinks = [...links, ...(admin ? [{ href: '/settings', label: 'Administración' }] : [])];

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-label={`Tu cuenta: ${user.name}`}
        className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-0 bg-transparent py-1 pl-1 pr-2 text-[color:var(--color-ink)] hover:bg-[color:var(--color-surface-2)] data-[state=open]:bg-[color:var(--color-surface-2)]"
      >
        <span aria-hidden className="grid h-9 w-9 place-items-center rounded-full text-[13.5px] font-bold text-white" style={{ background: user.avatarColor }}>
          {initialsOf(user.name)}
        </span>
        <span aria-hidden className="max-w-[180px] truncate text-[15px] font-semibold max-md:hidden">{user.name}</span>
        <ChevronDown aria-hidden className="h-4 w-4 text-[color:var(--color-muted)]" />
      </DropdownMenu.Trigger>
      {/* Sin portal: el menú queda dentro de la cabecera (un landmark), no suelto en <body>. */}
        <DropdownMenu.Content align="end" sideOffset={6} className="z-[60] w-[min(280px,calc(100vw-24px))] rounded-[12px] border border-[color:var(--color-border)] bg-white p-1.5 shadow-[var(--shadow-md)]">
          <div className="border-b border-[color:var(--color-border)] px-3 pb-2.5 pt-2">
            <p className="m-0 truncate text-[15px] font-bold text-[color:var(--color-ink)]">{user.name}</p>
            <p className="m-0 truncate text-[13.5px] text-[color:var(--color-muted)]">{user.email} · {ROLE_LABEL[user.role]}</p>
          </div>
          {mobileLinks.length > 0 && (
            <div className="border-b border-[color:var(--color-border)] py-1 lg:hidden">
              {mobileLinks.map(link => (
                <DropdownMenu.Item key={link.href} asChild>
                  <Link href={link.href} aria-current={isLinkActive(pathname, link) ? 'page' : undefined} className={cn(ITEM, 'aria-[current=page]:font-semibold aria-[current=page]:text-[color:var(--color-accent-fg)]')}>
                    {link.label}
                  </Link>
                </DropdownMenu.Item>
              ))}
            </div>
          )}
          <div className="py-1">
            <DropdownMenu.Item asChild>
              <Link href="/account" className={ITEM}><UserRound aria-hidden className={ICON} />Mi cuenta</Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <Link href="/account#contrasena" className={ITEM}><KeyRound aria-hidden className={ICON} />Cambiar contraseña</Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <a href={SUPPORT_HREF} className={ITEM}><CircleHelp aria-hidden className={ICON} />Ayuda y soporte</a>
            </DropdownMenu.Item>
          </div>
          <DropdownMenu.Separator className="h-px bg-[color:var(--color-border)]" />
          <div className="pt-1">
            <DropdownMenu.Item
              disabled={leaving}
              onSelect={() => startLeaving(() => logoutAction())}
              className={cn(ITEM, 'text-[color:var(--color-danger)] data-[highlighted]:bg-[color:var(--color-danger-soft)] data-[highlighted]:text-[color:var(--color-danger)]')}
            >
              <LogOut aria-hidden className="h-[18px] w-[18px] flex-shrink-0" />{leaving ? 'Cerrando sesión…' : 'Cerrar sesión'}
            </DropdownMenu.Item>
          </div>
        </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
