'use client';

import { LogOut } from 'lucide-react';
import { logoutAction } from '@/lib/actions';

/** Mismo look que NavItem, pero `<button>` para poder disparar la server action. */
export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-[10px] border-0 bg-transparent px-3 py-2.5 text-left text-[13.5px] font-medium text-[color:var(--color-nav-fg)] transition-colors hover:bg-[color:var(--color-nav-bg-hover)] hover:text-[color:var(--color-nav-fg-active)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-copper-300)]"
      >
        <span aria-hidden className="grid h-4 w-4 flex-shrink-0 place-items-center text-current [&_svg]:h-4 [&_svg]:w-4">
          <LogOut />
        </span>
        <span>Cerrar sesión</span>
      </button>
    </form>
  );
}
