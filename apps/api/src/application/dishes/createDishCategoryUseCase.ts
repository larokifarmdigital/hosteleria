import type { DishRepository } from '../../domain/repositories/dishRepository.js';
import type { I18nValue } from '../../domain/models/i18n.js';
import type { DishCategory, DishKind } from '../../domain/models/dish.js';

export class CreateDishCategoryUseCase {
  constructor(private readonly dishes: DishRepository) {}

  async execute(input: { spaceId: string; name: I18nValue; order: number; kind?: DishKind }): Promise<DishCategory> {
    return this.dishes.createCategory(input);
  }
}
