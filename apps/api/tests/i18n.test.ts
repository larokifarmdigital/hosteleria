import { describe, it, expect } from 'vitest';
import { i18nHasAny, i18nLocalesFilled } from '../src/db/schema/i18n';

describe('i18nHasAny', () => {
  it('null / undefined / vacío → false', () => {
    expect(i18nHasAny(null)).toBe(false);
    expect(i18nHasAny(undefined)).toBe(false);
    expect(i18nHasAny({})).toBe(false);
  });

  it('solo strings vacíos o whitespace → false', () => {
    expect(i18nHasAny({ es: '', ca: '   ' })).toBe(false);
  });

  it('al menos un locale con texto → true', () => {
    expect(i18nHasAny({ es: 'Hola' })).toBe(true);
    expect(i18nHasAny({ es: '', en: 'Hello' })).toBe(true);
  });
});

describe('i18nLocalesFilled', () => {
  it('lista los locales con contenido real', () => {
    expect(i18nLocalesFilled({ es: 'Hola', ca: '', en: 'Hello' })).toEqual(['es', 'en']);
  });

  it('devuelve [] si no hay nada', () => {
    expect(i18nLocalesFilled({})).toEqual([]);
    expect(i18nLocalesFilled(null)).toEqual([]);
  });
});
