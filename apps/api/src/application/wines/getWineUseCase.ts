import type { WineRepository } from '../../domain/repositories/wineRepository.js';
import { WineNotFoundError, type Wine } from '../../domain/models/wine.js';

export class GetWineUseCase {
  constructor(private readonly wines: WineRepository) {}

  async execute(id: string): Promise<Wine> {
    const w = await this.wines.findById(id);
    if (!w) throw new WineNotFoundError(id);
    return w;
  }
}
