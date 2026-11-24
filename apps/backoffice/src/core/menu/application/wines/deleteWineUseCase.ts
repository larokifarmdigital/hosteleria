import type { WineRepository } from '../../domain/repositories/wineRepository';
import { WineNotFoundError } from '../../domain/models/wine';

export class DeleteWineUseCase {
  constructor(private readonly wines: WineRepository) {}

  async execute(id: string): Promise<void> {
    const w = await this.wines.findById(id);
    if (!w) throw new WineNotFoundError(id);
    await this.wines.deleteById(id);
  }
}
