'use client';

import { useRef } from 'react';

/**
 * Para diálogos de Radix abiertos desde un botón normal: Radix solo devuelve el
 * foco a un `Dialog.Trigger`, y sin él el foco acaba en `body` al cerrar. Guarda
 * quién tenía el foco al abrir y se lo devuelve; si ya no existe (se borró su
 * fila, por ejemplo), lo lleva a `fallback` o, sin él, al contenido principal.
 */
export function useReturnFocus(fallback?: () => HTMLElement | null) {
  const opener = useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus: () => { opener.current = document.activeElement as HTMLElement | null; },
    onCloseAutoFocus: (event: Event) => {
      event.preventDefault();
      const from = opener.current;
      // `body` cuenta como «nadie»: pasa cuando el botón que abrió el diálogo ha desaparecido al abrirlo.
      const target = from && from !== document.body && from.isConnected ? from : fallback?.() ?? document.getElementById('contenido');
      target?.focus();
    }
  };
}
