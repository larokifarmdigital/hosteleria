import type { LanguageRepository } from '../../domain/repositories/languageRepository.js';
import { LanguageInUseError } from '../../domain/models/language.js';

/**
 * Hard delete del idioma. Pre-check: no debe estar activo en ningún
 * restaurante (lanza `LanguageInUseError` si lo está).
 */
export class DeleteLanguageUseCase {
  constructor(private readonly languages: LanguageRepository) {}

  async execute(id: string): Promise<void> {
    const n = await this.languages.countUsage(id);
    if (n > 0) throw new LanguageInUseError();
    await this.languages.deleteById(id);
  }
}
