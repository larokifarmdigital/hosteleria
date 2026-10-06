export interface RebuildHookCaller {
  /** Fire-and-forget: nunca lanza, timeout corto. `meta` solo entra al log. */
  call(url: string, meta?: { restaurantSlug?: string }): Promise<void>;
}
