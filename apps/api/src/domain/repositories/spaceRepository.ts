import type { Space, SpaceSnapshot, ScheduleDay } from '../models/space.js';

/**
 * Puerto de persistencia para `Space`.
 *
 * Los spaces están nested bajo un restaurant. El `schedule` (horarios por
 * día) se persiste en una tabla aparte (`space_schedule`); el repo lo
 * compone al leer y lo reemplaza atómicamente al guardar.
 */
export interface SpaceRepository {
  findById(id: string): Promise<Space | null>;
  listByRestaurantSlug(slug: string): Promise<Space[]>;
  countByRestaurant(restaurantId: string): Promise<number>;

  create(input: {
    restaurantId: string;
    slug: string;
    name: string;
    type: Space['type'];
    descriptor: string;
    isDefault: boolean;
  }): Promise<Space>;

  update(id: string, patch: Partial<Space>, actorId: string): Promise<void>;

  /** Reemplaza el schedule completo (delete all + insert new) en 1 transaction. */
  replaceSchedule(spaceId: string, schedule: ScheduleDay[]): Promise<void>;

  saveSnapshot(id: string, snapshot: SpaceSnapshot): Promise<void>;

  deleteById(id: string): Promise<void>;
}
