import type { FieldErrors } from 'react-hook-form';

/** Nº de campos con error (las hojas del árbol de errores). */
export function countErrors(errors: FieldErrors): number {
  let n = 0;
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    if ('message' in node && typeof (node as { message?: unknown }).message === 'string') { n++; return; }
    Object.values(node).forEach(walk);
  };
  walk(errors);
  return n;
}
