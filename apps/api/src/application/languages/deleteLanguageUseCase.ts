import type { LanguageRepository } from '../../domain/repositories/languageRepository.js';
import { LanguageInUseError } from '../../domain/models/language.js';

/** Restrict: lanza `LanguageInUseError` si algún restaurant lo tiene activo. */
export class DeleteLanguageUseCase {
  constructor(private readonly languages: LanguageRepository) {}

  async execute(id: string): Promise<void> {
    const n = await this.languages.countUsage(id);
    if (n > 0) throw new LanguageInUseError();
    await this.languages.deleteById(id);
  }
}
