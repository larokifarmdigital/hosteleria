import type { LanguageRepository } from '../../domain/repositories/languageRepository.js';
import type { Language } from '../../domain/models/language.js';

export interface LanguageWithUsage {
  language: Language;
  usedByCount: number;
}

export class ListLanguagesUseCase {
  constructor(private readonly languages: LanguageRepository) {}

  async execute(): Promise<LanguageWithUsage[]> {
    const all = await this.languages.list();
    return Promise.all(all.map(async l => ({
      language: l,
      usedByCount: await this.languages.countUsage(l.id)
    })));
  }
}
