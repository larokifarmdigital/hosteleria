import type { WineRepository } from '../../domain/repositories/wineRepository.js';
import { WineNotFoundError, WineCategoryNotFoundError, type Wine } from '../../domain/models/wine.js';

export class UpdateWineUseCase {
  constructor(private readonly wines: WineRepository) {}

  async execute(id: string, patch: Partial<Wine>, actorId: string): Promise<Wine> {
    const w = await this.wines.findById(id);
    if (!w) throw new WineNotFoundError(id);

    if (patch.categoryId !== undefined && patch.categoryId !== w.categoryId) {
      const cat = await this.wines.findCategoryById(patch.categoryId);
      if (!cat || cat.spaceId !== w.spaceId) throw new WineCategoryNotFoundError(patch.categoryId);
    }

    await this.wines.update(id, patch, actorId);
    return (await this.wines.findById(id))!;
  }
}
