import type { I18nValue } from './i18n.js';

export const LEGAL_PAGE_TYPES = ['legal-notice', 'privacy', 'cookies'] as const;
export type LegalPageType = (typeof LEGAL_PAGE_TYPES)[number];

/** Una por tipo y restaurante. Como la carta, no tiene borrador. */
export interface LegalPage {
  readonly id: string;
  readonly restaurantId: string;
  readonly type: LegalPageType;
  title: I18nValue;
  /** Markdown por idioma. */
  content: I18nValue;
  /** "YYYY-MM-DD"; la fecha que se enseña como «última actualización». */
  lastUpdated: string | null;
  updatedAt: Date;
}
