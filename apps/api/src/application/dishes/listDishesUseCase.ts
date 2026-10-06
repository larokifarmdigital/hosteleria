import type { DishRepository } from '../../domain/repositories/dishRepository.js';
import type { Dish } from '../../domain/models/dish.js';

export interface ListDishesFilters {
  restaurantSlug?: string;
  categoryId?: string;
  missingLocale?: string;
}

export class ListDishesUseCase {
  constructor(private readonly dishes: DishRepository) {}

  async execute(filters?: ListDishesFilters): Promise<Dish[]> {
    return this.dishes.list(filters);
  }
}
