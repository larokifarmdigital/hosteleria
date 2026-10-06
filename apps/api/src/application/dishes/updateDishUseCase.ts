import type { DishRepository } from '../../domain/repositories/dishRepository.js';
import { DishNotFoundError, DishCategoryNotFoundError, type Dish } from '../../domain/models/dish.js';

export class UpdateDishUseCase {
  constructor(private readonly dishes: DishRepository) {}

  async execute(id: string, patch: Partial<Dish>, actorId: string): Promise<Dish> {
    const d = await this.dishes.findById(id);
    if (!d) throw new DishNotFoundError(id);

    // Si se cambia la categoría, debe pertenecer al mismo space.
    if (patch.categoryId !== undefined && patch.categoryId !== d.categoryId) {
      const cat = await this.dishes.findCategoryById(patch.categoryId);
      if (!cat || cat.spaceId !== d.spaceId) throw new DishCategoryNotFoundError(patch.categoryId);
    }

    await this.dishes.update(id, patch, actorId);
    return (await this.dishes.findById(id))!;
  }
}
