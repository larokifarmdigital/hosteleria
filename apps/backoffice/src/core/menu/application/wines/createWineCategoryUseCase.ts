import type { WineRepository } from '../../domain/repositories/wineRepository.js';
import type { I18nValue } from '../../domain/models/i18n.js';
import type { WineCategory } from '../../domain/models/wine.js';

export class CreateWineCategoryUseCase {
  constructor(private readonly wines: WineRepository) {}

  async execute(input: { spaceId: string; name: I18nValue; order: number }): Promise<WineCategory> {
    return this.wines.createCategory(input);
  }
}
