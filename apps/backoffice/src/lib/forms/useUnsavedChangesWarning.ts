'use client';

import { useEffect } from 'react';

const MESSAGE = 'Tienes cambios sin guardar. Si sales ahora, se perderán. ¿Salir de todos modos?';

/**
 * Avisa antes de perder cambios. `beforeunload` cubre recargar y cerrar la
 * pestaña; los enlaces internos se interceptan en captura porque el App Router
 * no ofrece ningún evento para cancelar una navegación.
 */
export function useUnsavedChangesWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!link || link.target === '_blank' || link.origin !== window.location.origin) return;
      if (link.pathname === window.location.pathname && link.search === window.location.search) return;
      if (!window.confirm(MESSAGE)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty]);
}
