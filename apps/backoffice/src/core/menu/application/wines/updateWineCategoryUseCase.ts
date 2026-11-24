import type { WineRepository } from '../../domain/repositories/wineRepository';
import { WineCategoryNotFoundError } from '../../domain/models/wine';
import type { I18nValue } from '@/core/shared';

export class UpdateWineCategoryUseCase {
  constructor(private readonly wines: WineRepository) {}

  async execute(id: string, patch: { name?: I18nValue; order?: number }): Promise<void> {
    const cat = await this.wines.findCategoryById(id);
    if (!cat) throw new WineCategoryNotFoundError(id);
    await this.wines.updateCategory(id, patch);
  }
}
