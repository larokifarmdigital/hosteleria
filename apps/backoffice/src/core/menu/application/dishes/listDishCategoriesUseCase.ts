import type { DishRepository } from '../../domain/repositories/dishRepository';
import type { DishCategory, DishKind } from '../../domain/models/dish';

export class ListDishCategoriesUseCase {
  constructor(private readonly dishes: DishRepository) {}

  async execute(spaceId?: string, kind?: DishKind): Promise<DishCategory[]> {
    return this.dishes.listCategories(spaceId, kind);
  }
}
