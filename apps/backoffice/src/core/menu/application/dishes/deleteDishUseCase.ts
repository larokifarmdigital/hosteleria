import type { DishRepository } from '../../domain/repositories/dishRepository';
import { DishNotFoundError } from '../../domain/models/dish';

export class DeleteDishUseCase {
  constructor(private readonly dishes: DishRepository) {}

  async execute(id: string): Promise<void> {
    const d = await this.dishes.findById(id);
    if (!d) throw new DishNotFoundError(id);
    await this.dishes.deleteById(id);
  }
}
