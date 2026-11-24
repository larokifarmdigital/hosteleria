import type { WineRepository } from '../../domain/repositories/wineRepository';
import type { WineCategory } from '../../domain/models/wine';

export class ListWineCategoriesUseCase {
  constructor(private readonly wines: WineRepository) {}

  async execute(spaceId?: string): Promise<WineCategory[]> {
    return this.wines.listCategories(spaceId);
  }
}
