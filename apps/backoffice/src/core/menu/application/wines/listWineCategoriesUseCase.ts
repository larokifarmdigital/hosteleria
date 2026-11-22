import type { WineRepository } from '../../domain/repositories/wineRepository.js';
import type { WineCategory } from '../../domain/models/wine.js';

export class ListWineCategoriesUseCase {
  constructor(private readonly wines: WineRepository) {}

  async execute(spaceId?: string): Promise<WineCategory[]> {
    return this.wines.listCategories(spaceId);
  }
}
