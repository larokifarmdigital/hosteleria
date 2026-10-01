'use client';

import { LogOut } from 'lucide-react';
import { logoutAction } from '@/lib/actions';

/**
 * Botón que ejecuta la server action de logout. Usa el mismo look que
 * NavItem pero como `<button>` para poder disparar la acción.
 */
export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] border-0 bg-transparent px-3 py-2.5 text-left text-[13.5px] font-medium text-[color:var(--color-nav-fg)] transition-colors hover:bg-[color:var(--color-nav-bg-hover)] hover:text-[color:var(--color-nav-fg-active)]"
      >
        <span className="grid h-4 w-4 flex-shrink-0 place-items-center text-current [&_svg]:h-4 [&_svg]:w-4">
          <LogOut />
        </span>
        <span>Cerrar sesión</span>
      </button>
    </form>
  );
}
