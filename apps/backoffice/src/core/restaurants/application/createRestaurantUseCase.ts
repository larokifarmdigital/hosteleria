import type { RestaurantRepository } from '../../domain/repositories/restaurantRepository.js';
import type { LanguageRepository } from '../../domain/repositories/languageRepository.js';
import type { Restaurant } from '../../domain/models/restaurant.js';

export interface CreateRestaurantInput {
  slug: string;
  name: string;
  domain: string;
  logoInitial: string;
  defaultLocaleCode: string;
  activeLocaleCodes: string[];
}

export class CreateRestaurantUseCase {
  constructor(
    private readonly restaurants: RestaurantRepository,
    private readonly languages: LanguageRepository
  ) {}

  async execute(input: CreateRestaurantInput): Promise<Restaurant> {
    const defaultLocaleId = (await this.languages.resolveCodes([input.defaultLocaleCode]))[0];
    const activeLocaleIds = await this.languages.resolveCodes(input.activeLocaleCodes);

    return this.restaurants.createWithLocales({
      slug: input.slug,
      name: input.name,
      domain: input.domain,
      logoInitial: input.logoInitial || input.name.charAt(0).toUpperCase(),
      defaultLocaleId,
      activeLocaleIds
    });
  }
}
