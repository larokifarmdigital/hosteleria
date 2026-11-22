import type { WineRepository } from '../../domain/repositories/wineRepository';
import type { Wine } from '../../domain/models/wine';

export class ListWinesUseCase {
  constructor(private readonly wines: WineRepository) {}

  async execute(filters?: { restaurantSlug?: string; categoryId?: string }): Promise<Wine[]> {
    return this.wines.list(filters);
  }
}
