/**
 * Puerto para disparar el "deploy hook" de una landing cuando se publican
 * cambios en un restaurant.
 *
 * Fire-and-forget — no bloquea la response del api. Timeout corto
 * (3s por defecto en la impl).
 */
export interface RebuildHookCaller {
  /**
   * Llama al hook (POST sin body). Nunca lanza — loguea el resultado y
   * sigue. Metadata opcional solo se usa para logs.
   */
  call(url: string, meta?: { restaurantSlug?: string }): Promise<void>;
}
