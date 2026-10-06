import type { RestaurantRepository } from '../../domain/repositories/restaurantRepository.js';
import type { LanguageRepository } from '../../domain/repositories/languageRepository.js';
import type { Restaurant } from '../../domain/models/restaurant.js';

/**
 * Crea un restaurante + sus locales activos en una operación atómica.
 *
 * Flujo:
 *  1. Resuelve códigos ISO (`es`, `ca`, …) a `language_id` via LanguageRepository.
 *     Si alguno no existe, lanza `LanguageNotFoundError`.
 *  2. Asegura que `defaultLocale` esté en `activeLocales` (invariant del dominio).
 *  3. Delega al repo `createWithLocales`, que valida slug único y hace el
 *     INSERT en 1 transacción.
 */
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
