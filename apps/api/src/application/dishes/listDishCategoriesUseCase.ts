import type { DishRepository } from '../../domain/repositories/dishRepository.js';
import type { DishCategory } from '../../domain/models/dish.js';

export class ListDishCategoriesUseCase {
  constructor(private readonly dishes: DishRepository) {}

  async execute(spaceId?: string): Promise<DishCategory[]> {
    return this.dishes.listCategories(spaceId);
  }
}
