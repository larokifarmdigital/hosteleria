import type { WineRepository } from '../../domain/repositories/wineRepository.js';
import { WineNotFoundError } from '../../domain/models/wine.js';

export class DeleteWineUseCase {
  constructor(private readonly wines: WineRepository) {}

  async execute(id: string): Promise<void> {
    const w = await this.wines.findById(id);
    if (!w) throw new WineNotFoundError(id);
    await this.wines.deleteById(id);
  }
}
