import type { WineRepository } from '../../domain/repositories/wineRepository';
import { WineCategoryNotFoundError, type Wine } from '../../domain/models/wine';

export class CreateWineUseCase {
  constructor(private readonly wines: WineRepository) {}

  async execute(input: Omit<Wine, 'id'>): Promise<Wine> {
    // La categoría debe pertenecer al mismo space.
    const cat = await this.wines.findCategoryById(input.categoryId);
    if (!cat || cat.spaceId !== input.spaceId) throw new WineCategoryNotFoundError(input.categoryId);
    return this.wines.create(input);
  }
}
