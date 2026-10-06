import type { DishRepository } from '../../domain/repositories/dishRepository.js';
import { DishCategoryNotFoundError } from '../../domain/models/dish.js';

export class DeleteDishCategoryUseCase {
  constructor(private readonly dishes: DishRepository) {}

  async execute(id: string): Promise<void> {
    const cat = await this.dishes.findCategoryById(id);
    if (!cat) throw new DishCategoryNotFoundError(id);
    await this.dishes.deleteCategory(id);
  }
}
