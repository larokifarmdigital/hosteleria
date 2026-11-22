import type { LanguageRepository } from '../../domain/repositories/languageRepository.js';
import { LanguageNotFoundError } from '../../domain/models/language.js';

export class UpdateLanguageUseCase {
  constructor(private readonly languages: LanguageRepository) {}

  async execute(id: string, patch: { name?: string }): Promise<void> {
    const existing = await this.languages.findById(id);
    if (!existing) throw new LanguageNotFoundError(id);
    await this.languages.update(id, patch);
  }
}
