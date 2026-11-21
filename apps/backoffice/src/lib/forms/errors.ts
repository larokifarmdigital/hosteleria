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

/** Ruta del primer campo con error, p. ej. `contact.email`. */
export function firstErrorPath(errors: FieldErrors): string | undefined {
  const walk = (node: unknown, path: string[]): string | undefined => {
    if (!node || typeof node !== 'object') return undefined;
    if ('message' in node && typeof (node as { message?: unknown }).message === 'string') return path.join('.');
    for (const [key, child] of Object.entries(node)) {
      const found = walk(child, [...path, key]);
      if (found) return found;
    }
    return undefined;
  };
  return walk(errors, []);
}
