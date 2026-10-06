import type { WineRepository } from '../../domain/repositories/wineRepository.js';
import { WineCategoryNotFoundError, type Wine } from '../../domain/models/wine.js';

export class CreateWineUseCase {
  constructor(private readonly wines: WineRepository) {}

  async execute(input: Omit<Wine, 'id'>): Promise<Wine> {
    // Misma coherencia que dishes: la categoría tiene que pertenecer al mismo space.
    const cat = await this.wines.findCategoryById(input.categoryId);
    if (!cat || cat.spaceId !== input.spaceId) throw new WineCategoryNotFoundError(input.categoryId);
    return this.wines.create(input);
  }
}
