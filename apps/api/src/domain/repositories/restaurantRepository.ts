import type { Restaurant, RestaurantSnapshot } from '../models/restaurant.js';

export interface RestaurantRepository {
  findBySlug(slug: string): Promise<Restaurant | null>;
  findById(id: string): Promise<Restaurant | null>;

  /** `null` = admin (sin filtro); `string[]` = ids explícitos del editor. */
  listAccessibleBy(allowedIds: string[] | null): Promise<Restaurant[]>;

  /** INSERT atómico del restaurant + sus locales. Lanza `SlugTakenError`. */
  createWithLocales(input: {
    slug: string;
    name: string;
    domain: string;
    logoInitial: string;
    defaultLocaleId: string;
    activeLocaleIds: string[];
  }): Promise<Restaurant>;

  update(id: string, patch: Partial<Restaurant>, actorId: string): Promise<void>;

  /** Reemplaza TODA la lista de locales activos (delete + insert atómico). */
  replaceLocales(id: string, languageIds: string[]): Promise<void>;

  saveSnapshot(id: string, snapshot: RestaurantSnapshot, publishedAt: Date): Promise<void>;

  /** Hard delete; FKs encadenan a spaces/dishes/wines. */
  deleteBySlug(slug: string): Promise<void>;
}
