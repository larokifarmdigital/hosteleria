export interface RebuildHookCaller {
  /** Nunca lanza, timeout corto. Devuelve si el proveedor aceptó la petición. `meta` solo entra al log. */
  call(url: string, meta?: { restaurantSlug?: string }): Promise<boolean>;
}
