import type { DishRepository } from '../../domain/repositories/dishRepository.js';
import { DishCategoryNotFoundError, type Dish } from '../../domain/models/dish.js';

/**
 * Crea un plato. Verifica que la categoría exista + pertenezca al mismo
 * space (coherencia referencial — un plato de "Entrantes" del Comedor no
 * puede referenciar la "Entrantes" de la Terraza).
 */
export class CreateDishUseCase {
  constructor(private readonly dishes: DishRepository) {}

  async execute(input: Omit<Dish, 'id'>): Promise<Dish> {
    const cat = await this.dishes.findCategoryById(input.categoryId);
    if (!cat || cat.spaceId !== input.spaceId) throw new DishCategoryNotFoundError(input.categoryId);
    return this.dishes.create(input);
  }
}
