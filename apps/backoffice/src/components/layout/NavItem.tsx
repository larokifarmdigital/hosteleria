'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  matchPrefix?: boolean;
}

export function NavItem({ href, icon, label, matchPrefix = true }: NavItemProps) {
  const pathname = usePathname();
  const active = matchPrefix ? pathname === href || pathname.startsWith(href + '/') : pathname === href;

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-11 w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13.5px] font-medium text-[color:var(--color-nav-fg)] transition-colors',
        'hover:bg-[color:var(--color-nav-bg-hover)] hover:text-[color:var(--color-nav-fg-active)]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-copper-300)]',
        active &&
          'bg-[color:var(--color-nav-bg-active)] text-[color:var(--color-nav-fg-active)] shadow-[inset_3px_0_0_var(--color-copper-400)]'
      )}
    >
      <span aria-hidden className="grid h-4 w-4 flex-shrink-0 place-items-center text-current [&_svg]:h-4 [&_svg]:w-4">
        {icon}
      </span>
      <span className="flex-1">{label}</span>
    </Link>
  );
}
