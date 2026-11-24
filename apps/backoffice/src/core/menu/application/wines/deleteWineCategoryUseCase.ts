import type { WineRepository } from '../../domain/repositories/wineRepository';
import { WineCategoryNotFoundError } from '../../domain/models/wine';

export class DeleteWineCategoryUseCase {
  constructor(private readonly wines: WineRepository) {}

  async execute(id: string): Promise<void> {
    const cat = await this.wines.findCategoryById(id);
    if (!cat) throw new WineCategoryNotFoundError(id);
    await this.wines.deleteCategory(id);
  }
}
