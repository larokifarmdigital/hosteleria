import type { DishRepository } from '../../domain/repositories/dishRepository.js';
import type { Dish, DishKind } from '../../domain/models/dish.js';

export interface ListDishesFilters {
  restaurantSlug?: string;
  categoryId?: string;
  missingLocale?: string;
  kind?: DishKind;
}

export class ListDishesUseCase {
  constructor(private readonly dishes: DishRepository) {}

  async execute(filters?: ListDishesFilters): Promise<Dish[]> {
    return this.dishes.list(filters);
  }
}
