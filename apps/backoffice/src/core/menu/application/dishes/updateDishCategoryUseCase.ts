import type { DishRepository } from '../../domain/repositories/dishRepository.js';
import { DishCategoryNotFoundError } from '../../domain/models/dish.js';
import type { I18nValue } from '../../domain/models/i18n.js';

export class UpdateDishCategoryUseCase {
  constructor(private readonly dishes: DishRepository) {}

  async execute(id: string, patch: { name?: I18nValue; order?: number }): Promise<void> {
    const cat = await this.dishes.findCategoryById(id);
    if (!cat) throw new DishCategoryNotFoundError(id);
    await this.dishes.updateCategory(id, patch);
  }
}
