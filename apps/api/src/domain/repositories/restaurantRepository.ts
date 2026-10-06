import type { Restaurant, RestaurantSnapshot } from '../models/restaurant.js';

/**
 * Puerto de persistencia para `Restaurant`.
 *
 * El dominio define QUÉ necesita; la implementación (en `infrastructure/`)
 * decide CÓMO lo hace (Drizzle, Prisma, raw SQL, mock…).
 *
 * Las transactions internas (ej. "crear restaurant + locales") viven en el
 * adapter — el use case las ve como una operación atómica.
 */
export interface RestaurantRepository {
  /** Devuelve el restaurant por slug o `null` si no existe. */
  findBySlug(slug: string): Promise<Restaurant | null>;

  /** Devuelve el restaurant por id o `null` si no existe. */
  findById(id: string): Promise<Restaurant | null>;

  /**
   * Lista restaurantes accesibles por un user.
   * - `null` → user admin, devuelve todos
   * - `string[]` → ids explícitos (editor, viene de `user_restaurants`)
   */
  listAccessibleBy(allowedIds: string[] | null): Promise<Restaurant[]>;

  /**
   * Crea un restaurant + sus locales activos en UNA operación atómica.
   * Lanza `SlugTakenError` si el slug ya existe.
   */
  createWithLocales(input: {
    slug: string;
    name: string;
    domain: string;
    logoInitial: string;
    defaultLocaleId: string;
    activeLocaleIds: string[];
  }): Promise<Restaurant>;

  /** Actualiza campos editables del restaurant. */
  update(id: string, patch: Partial<Restaurant>, actorId: string): Promise<void>;

  /** Reemplaza TODA la lista de locales activos (delete + insert atómico). */
  replaceLocales(id: string, languageIds: string[]): Promise<void>;

  /** Guarda un snapshot (al publicar) para que `discard` pueda volver atrás. */
  saveSnapshot(id: string, snapshot: RestaurantSnapshot, publishedAt: Date): Promise<void>;

  /** Hard delete (cascade a spaces, dishes, wines, etc. vía FK). */
  deleteBySlug(slug: string): Promise<void>;
}
