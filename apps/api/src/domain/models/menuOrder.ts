import { DomainError } from './errors.js';

/** La lista para reordenar no es de un mismo sitio, repite elementos o nombra alguno que no existe. */
export class InvalidReorderError extends DomainError {
  readonly code = 'INVALID_REORDER';
  readonly status = 400;
  constructor(reason: string) {
    super(`No se ha podido cambiar el orden: ${reason} Recarga la página y vuelve a intentarlo.`);
    this.name = 'InvalidReorderError';
  }
}

/**
 * Comprueba una lista de ids para reordenar: sin repetidos, todos existen y
 * todos comparten grupo (la categoría de los platos, el espacio de las categorías).
 * Devuelve ese grupo.
 */
export function assertSameGroup<T>(ids: string[], found: (T | null)[], groupOf: (item: T) => string): string {
  if (new Set(ids).size !== ids.length) throw new InvalidReorderError('la lista repite elementos.');
  if (found.some(item => !item)) throw new InvalidReorderError('alguno de los elementos ya no existe.');
  const groups = new Set((found as T[]).map(groupOf));
  if (groups.size !== 1) throw new InvalidReorderError('los elementos no son del mismo sitio.');
  return [...groups][0];
}
