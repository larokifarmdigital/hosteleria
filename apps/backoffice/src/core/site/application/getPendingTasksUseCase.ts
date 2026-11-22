import type { RestaurantRepository } from '../../domain/repositories/restaurantRepository.js';
import type { SpaceRepository } from '../../domain/repositories/spaceRepository.js';
import type { DishRepository } from '../../domain/repositories/dishRepository.js';
import type { WineRepository } from '../../domain/repositories/wineRepository.js';
import type { LegalPageRepository } from '../../domain/repositories/legalPageRepository.js';
import type { MediaRepository } from '../../domain/repositories/mediaRepository.js';
import { RestaurantNotFoundError } from '../../domain/models/restaurant.js';
import { buildPendingTasks, type PendingTask } from '../../domain/models/pendingTasks.js';

export class GetPendingTasksUseCase {
  constructor(
    private readonly restaurants: RestaurantRepository,
    private readonly spaces: SpaceRepository,
    private readonly dishes: DishRepository,
    private readonly wines: WineRepository,
    private readonly legalPages: LegalPageRepository,
    private readonly media: MediaRepository
  ) {}

  async execute(slug: string): Promise<PendingTask[]> {
    const restaurant = await this.restaurants.findBySlug(slug);
    if (!restaurant) throw new RestaurantNotFoundError(slug);

    const [spaces, dishes, wines, legalPages, media] = await Promise.all([
      this.spaces.listByRestaurantId(restaurant.id),
      this.dishes.list({ restaurantSlug: slug }),
      this.wines.list({ restaurantSlug: slug }),
      this.legalPages.listByRestaurantId(restaurant.id),
      this.media.list({ restaurantSlug: slug })
    ]);
    const [dishCategories, wineCategories] = await Promise.all([
      Promise.all(spaces.map(s => this.dishes.listCategories(s.id))).then(lists => lists.flat()),
      Promise.all(spaces.map(s => this.wines.listCategories(s.id))).then(lists => lists.flat())
    ]);

    return buildPendingTasks({ restaurant, spaces, dishCategories, dishes, wineCategories, wines, legalPages, media });
  }
}
