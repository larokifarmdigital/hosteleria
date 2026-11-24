import type { DishRepository } from '../../domain/repositories/dishRepository';
import type { Dish, DishKind } from '../../domain/models/dish';

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
