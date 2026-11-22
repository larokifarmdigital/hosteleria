import type { LanguageRepository } from '../domain/repositories/languageRepository';
import { LanguageCodeTakenError, type Language } from '../domain/models/language';

export class CreateLanguageUseCase {
  constructor(private readonly languages: LanguageRepository) {}

  async execute(input: { code: string; name: string }): Promise<Language> {
    const existing = await this.languages.findByCode(input.code);
    if (existing) throw new LanguageCodeTakenError(input.code);
    return this.languages.create(input);
  }
}
