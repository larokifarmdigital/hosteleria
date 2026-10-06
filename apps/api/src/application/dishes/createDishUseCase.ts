import type { DishRepository } from '../../domain/repositories/dishRepository.js';
import { DishCategoryNotFoundError, type Dish } from '../../domain/models/dish.js';

export class CreateDishUseCase {
  constructor(private readonly dishes: DishRepository) {}

  async execute(input: Omit<Dish, 'id'>): Promise<Dish> {
    // Coherencia referencial: la categoría debe pertenecer al mismo space —
    // "Entrantes" del Comedor no vale para un plato de la Terraza.
    const cat = await this.dishes.findCategoryById(input.categoryId);
    if (!cat || cat.spaceId !== input.spaceId) throw new DishCategoryNotFoundError(input.categoryId);
    return this.dishes.create(input);
  }
}
