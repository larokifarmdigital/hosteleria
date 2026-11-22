import { describe, it, expect } from 'vitest';
import {
  i18nHasAny,
  i18nLocalesFilled,
  i18nMissingLocales,
  assertTranslationsComplete,
  TranslationsIncompleteError
} from '@/core/shared/domain';

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


describe('regla «todos los idiomas activos o ninguno»', () => {
  const active = ['es', 'ca', 'en'];

  it('un texto vacío en todos los idiomas no tiene pendientes', () => {
    expect(i18nMissingLocales({}, active)).toEqual([]);
    expect(i18nMissingLocales(undefined, active)).toEqual([]);
    expect(i18nMissingLocales({ es: '  ' }, active)).toEqual([]);
  });

  it('un texto completo no tiene pendientes, aunque sobre un idioma inactivo', () => {
    expect(i18nMissingLocales({ es: 'a', ca: 'b', en: 'c', fr: 'd' }, active)).toEqual([]);
  });

  it('a medias, devuelve los idiomas activos que faltan', () => {
    expect(i18nMissingLocales({ es: 'a' }, active)).toEqual(['ca', 'en']);
    expect(i18nMissingLocales({ fr: 'solo inactivo' }, active)).toEqual([]);
  });

  it('assertTranslationsComplete nombra los textos a medias', () => {
    expect(() => assertTranslationsComplete({ Título: { es: 'a', ca: 'b', en: 'c' }, Nota: {} }, active)).not.toThrow();
    try {
      assertTranslationsComplete({ Título: { es: 'a' }, Nota: {}, Botón: { en: 'Book' } }, active);
      throw new Error('debía fallar');
    } catch (e) {
      expect(e).toBeInstanceOf(TranslationsIncompleteError);
      expect((e as TranslationsIncompleteError).fields).toEqual(['Título', 'Botón']);
      expect((e as TranslationsIncompleteError).code).toBe('TRANSLATIONS_INCOMPLETE');
    }
  });
});
