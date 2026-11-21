import { describe, it, expect } from 'vitest';
import {
  RESTAURANT_CONTENT_KEYS,
  UI_TEXT_KEYS,
  restaurantMediaUses,
  restaurantTranslatableTexts
} from '../src/domain/models/restaurant.js';
import { SPACE_CONTENT_KEYS, spaceMediaIds, spaceTranslatableTexts } from '../src/domain/models/space.js';
import { assertTranslationsComplete, TranslationsIncompleteError } from '../src/domain/models/i18n.js';

const active = ['es', 'ca'];
const full = { es: 'a', ca: 'b' };
const half = { es: 'a' };

describe('textos traducibles del restaurante', () => {
  it('contenido vacío: nada pendiente', () => {
    expect(() => assertTranslationsComplete(restaurantTranslatableTexts({}), active)).not.toThrow();
  });

  it('recoge los textos sueltos y los de cada lista', () => {
    const texts = restaurantTranslatableTexts({
      seo: { title: full },
      about: { title: half, body: full },
      groups: { highlights: [{ id: 'h1', text: half }], features: [{ id: 'f1', icon: 'wine', label: full, text: half }] },
      homeBlocks: [{ id: 'b1', title: full, ctaText: half }],
      faq: { items: [{ id: 'q1', question: full, answer: full }, { id: 'q2', question: half }] },
      uiTexts: { nav: { book: half }, form: { submit: full } },
      aiSummary: half
    });
    let fields: string[] = [];
    try {
      assertTranslationsComplete(texts, active);
    } catch (e) {
      fields = (e as TranslationsIncompleteError).fields;
    }
    expect(fields).toEqual([
      'Sobre nosotros: título',
      'Resumen para asistentes de IA',
      'Grupos: punto destacado 1',
      'Grupos: ventaja 1, texto',
      'Bloque destacado 1: texto del botón',
      'Pregunta 2',
      'Textos de la web: nav.book'
    ]);
  });

  it('cubre todos los textos de interfaz declarados', () => {
    const labels = Object.keys(restaurantTranslatableTexts({}));
    const total = Object.values(UI_TEXT_KEYS).reduce((n, keys) => n + keys.length, 0);
    expect(labels.filter(l => l.startsWith('Textos de la web: '))).toHaveLength(total);
  });
});

describe('imágenes que usa la ficha', () => {
  it('lista cada uso con su sitio y salta los huecos', () => {
    expect(restaurantMediaUses({
      branding: { logoAssetId: 'logo', faviconAssetId: '' },
      seo: { imageAssetId: 'share' },
      about: { imageAssetIds: ['a1', 'a2'] },
      groups: { imageAssetId: 'g' },
      homeBlocks: [{ id: 'b1' }, { id: 'b2', imageAssetId: 'hb' }]
    })).toEqual([
      { use: 'logo', assetId: 'logo' },
      { use: 'seo', assetId: 'share' },
      { use: 'groups', assetId: 'g' },
      { use: 'about', assetId: 'a1' },
      { use: 'about', assetId: 'a2' },
      { use: 'homeBlock', assetId: 'hb' }
    ]);
    expect(restaurantMediaUses(null)).toEqual([]);
  });
});

describe('espacio', () => {
  it('portada y galería cuentan como imágenes del espacio', () => {
    expect(spaceMediaIds({ hero: { imageAssetId: 'h' }, gallery: ['g1', 'g2'] })).toEqual(['h', 'g1', 'g2']);
    expect(spaceMediaIds({})).toEqual([]);
  });

  it('la descripción de la foto solo cuenta si hay foto', () => {
    expect(Object.keys(spaceTranslatableTexts({ hero: { imageAlt: half } }))).not.toContain('Descripción de la foto');
    expect(() => assertTranslationsComplete(spaceTranslatableTexts({ hero: { imageAssetId: 'h', imageAlt: half } }), active))
      .toThrow(TranslationsIncompleteError);
  });

  it('los textos de horarios entran en la regla', () => {
    expect(() => assertTranslationsComplete(spaceTranslatableTexts({ scheduleTexts: { closed: half } }), active))
      .toThrow(TranslationsIncompleteError);
  });
});

describe('listas de campos de contenido', () => {
  it('no repiten claves', () => {
    expect(new Set(RESTAURANT_CONTENT_KEYS).size).toBe(RESTAURANT_CONTENT_KEYS.length);
    expect(new Set(SPACE_CONTENT_KEYS).size).toBe(SPACE_CONTENT_KEYS.length);
  });
});
