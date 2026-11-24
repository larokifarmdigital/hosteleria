import type { WineRepository } from '../../domain/repositories/wineRepository';
import type { I18nValue } from '@/core/shared';
import type { WineCategory } from '../../domain/models/wine';

export class CreateWineCategoryUseCase {
  constructor(private readonly wines: WineRepository) {}

  async execute(input: { spaceId: string; name: I18nValue; order: number }): Promise<WineCategory> {
    return this.wines.createCategory(input);
  }
}
