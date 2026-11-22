import type { DishRepository } from '../../domain/repositories/dishRepository.js';
import { DishNotFoundError, type Dish } from '../../domain/models/dish.js';

export class GetDishUseCase {
  constructor(private readonly dishes: DishRepository) {}

  async execute(id: string): Promise<Dish> {
    const d = await this.dishes.findById(id);
    if (!d) throw new DishNotFoundError(id);
    return d;
  }
}
