import type { DishRepository } from '../../domain/repositories/dishRepository';
import type { I18nValue } from '@/core/shared';
import type { DishCategory, DishKind } from '../../domain/models/dish';

export class CreateDishCategoryUseCase {
  constructor(private readonly dishes: DishRepository) {}

  async execute(input: { spaceId: string; name: I18nValue; order: number; kind?: DishKind }): Promise<DishCategory> {
    return this.dishes.createCategory(input);
  }
}
