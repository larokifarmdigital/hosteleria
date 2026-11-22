import type { LegalPageRepository } from '../../domain/repositories/legalPageRepository.js';
import type { RestaurantRepository } from '../../domain/repositories/restaurantRepository.js';
import type { LegalPage, LegalPageType } from '../../domain/models/legalPage.js';
import { RestaurantNotFoundError } from '../../domain/models/restaurant.js';

async function restaurantIdOf(restaurants: RestaurantRepository, slug: string): Promise<string> {
  const r = await restaurants.findBySlug(slug);
  if (!r) throw new RestaurantNotFoundError(slug);
  return r.id;
}

export class ListLegalPagesUseCase {
  constructor(private readonly pages: LegalPageRepository, private readonly restaurants: RestaurantRepository) {}

  async execute(slug: string): Promise<LegalPage[]> {
    return this.pages.listByRestaurantId(await restaurantIdOf(this.restaurants, slug));
  }
}

export class SaveLegalPageUseCase {
  constructor(private readonly pages: LegalPageRepository, private readonly restaurants: RestaurantRepository) {}

  async execute(
    slug: string,
    type: LegalPageType,
    data: Pick<LegalPage, 'title' | 'content' | 'lastUpdated'>,
    actorId: string
  ): Promise<LegalPage> {
    return this.pages.upsert(await restaurantIdOf(this.restaurants, slug), type, data, actorId);
  }
}

export class DeleteLegalPageUseCase {
  constructor(private readonly pages: LegalPageRepository, private readonly restaurants: RestaurantRepository) {}

  async execute(slug: string, type: LegalPageType): Promise<void> {
    await this.pages.delete(await restaurantIdOf(this.restaurants, slug), type);
  }
}
