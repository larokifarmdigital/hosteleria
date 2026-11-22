import type { DishRepository } from '../../domain/repositories/dishRepository.js';
import type { DishCategory, DishKind } from '../../domain/models/dish.js';

export class ListDishCategoriesUseCase {
  constructor(private readonly dishes: DishRepository) {}

  async execute(spaceId?: string, kind?: DishKind): Promise<DishCategory[]> {
    return this.dishes.listCategories(spaceId, kind);
  }
}
