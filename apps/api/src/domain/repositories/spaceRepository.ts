import type { Space, SpaceSnapshot, ScheduleDay } from '../models/space.js';

/**
 * El schedule vive en `space_schedule` (una fila por turno) y lo compone
 * el adapter al leer; `replaceSchedule` lo sustituye entero en una
 * transaction para no dejar estados intermedios.
 */
export interface SpaceRepository {
  findById(id: string): Promise<Space | null>;
  findByRestaurantAndSlug(restaurantId: string, slug: string): Promise<Space | null>;
  listByRestaurantSlug(slug: string): Promise<Space[]>;
  listByRestaurantId(restaurantId: string): Promise<Space[]>;
  countByRestaurant(restaurantId: string): Promise<number>;

  create(input: {
    restaurantId: string;
    slug: string;
    name: string;
    type: Space['type'];
    descriptor: string;
    isDefault: boolean;
    order: number;
  }): Promise<Space>;

  update(id: string, patch: Partial<Space>, actorId: string): Promise<void>;

  /** Pone `isDefault=false` a todos los spaces del restaurant salvo `keepId`. */
  clearDefaultsExcept(restaurantId: string, keepId: string | null): Promise<void>;

  replaceSchedule(spaceId: string, schedule: ScheduleDay[]): Promise<void>;
  saveSnapshot(id: string, snapshot: SpaceSnapshot): Promise<void>;
  deleteById(id: string): Promise<void>;
}
