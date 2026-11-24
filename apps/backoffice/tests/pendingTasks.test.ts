import { describe, it, expect } from 'vitest';
import { buildPendingTasks, type PendingTaskSources } from '@/core/site/domain';
import type { Restaurant } from '@/core/restaurants/domain';
import type { Space } from '@/core/spaces/domain';
import type { MediaAsset } from '@/core/media/domain';

const full = { es: 'a', ca: 'b' };
const half = { es: 'a' };
const week = [{ day: 'Tu' as const, shifts: [{ open: '13:00', close: '16:00' }] }];

function restaurant(over: Partial<Restaurant> = {}): Restaurant {
  return {
    id: 'r1', slug: 'prueba', name: 'Prueba', domain: 'p.cat', logoInitial: 'P', coverGradient: 'g', state: 'published',
    defaultLocaleCode: 'es', activeLocaleCodes: ['es', 'ca'], acceptsBookings: true, showSocials: false, timezone: 'Europe/Madrid',
    rebuildHookUrl: null, address: {}, contact: {}, socials: {}, seo: {}, foundedYear: null, branding: {}, homeBlocks: [], about: {},
    groups: {}, mapUrl: null, showReviews: false, uiTexts: {}, faq: {}, aiSummary: {}, analyticsToken: null, business: {},
    lastPublishedAt: new Date(), publishedSnapshot: { name: 'Prueba' }, spacesCount: 1, dishesCount: 0, winesCount: 0, ...over
  };
}
function space(over: Partial<Space> = {}): Space {
  return {
    id: 's1', restaurantId: 'r1', slug: 'sala', name: 'Sala', type: 'restaurant', isDefault: true, order: 0, state: 'published',
    coverGradient: 'g', descriptor: '', hero: {}, manifesto: {}, gallery: [], scheduleTexts: {}, address: {}, mapUrl: null,
    bookingContact: {}, schedule: week, publishedSnapshot: { name: 'Sala' }, ...over
  };
}
const media = (id: string, altText: Record<string, string>): MediaAsset => ({
  id, restaurantId: 'r1', name: id, sizeKb: 1, width: 1, height: 1, mimeType: 'image/webp', r2Key: id, usage: 'unused',
  hasAltText: true, altText, createdAt: new Date(), confirmedAt: new Date(), uploadedBy: null
});
const src = (over: Partial<PendingTaskSources> = {}): PendingTaskSources => ({
  restaurant: restaurant(), spaces: [space()], dishCategories: [], dishes: [], wineCategories: [], wines: [], legalPages: [], media: [], ...over
});

describe('tareas pendientes', () => {
  it('con todo en orden no hay nada pendiente', () => {
    expect(buildPendingTasks(src())).toEqual([]);
  });

  it('avisa de lo que no está publicado y distingue lo que nunca se publicó', () => {
    const tasks = buildPendingTasks(src({
      restaurant: restaurant({ state: 'draft' }),
      spaces: [space({ state: 'draft', publishedSnapshot: null })]
    }));
    expect(tasks).toEqual([
      { type: 'unpublished', target: { kind: 'restaurant' }, neverPublished: false },
      { type: 'unpublished', target: { kind: 'space', spaceId: 's1', spaceName: 'Sala' }, neverPublished: true }
    ]);
  });

  it('un espacio sin turnos está pendiente de horario', () => {
    const tasks = buildPendingTasks(src({ spaces: [space({ schedule: [{ day: 'Mo', shifts: [] }] })] }));
    expect(tasks).toEqual([{ type: 'no_schedule', target: { kind: 'space', spaceId: 's1', spaceName: 'Sala' } }]);
  });

  it('las traducciones de la ficha salen por zona, con los idiomas que faltan', () => {
    const tasks = buildPendingTasks(src({
      restaurant: restaurant({
        about: { title: half, body: full }, faq: { items: [{ id: 'q', question: half, answer: half }] },
        uiTexts: { nav: { book: half } }, seo: { title: half }, aiSummary: full
      })
    }));
    expect(tasks).toEqual([
      { type: 'translations', target: { kind: 'restaurant', area: 'content' }, count: 3, locales: ['ca'], examples: ['Sobre nosotros: título', 'Pregunta 1', 'Respuesta 1'] },
      { type: 'translations', target: { kind: 'restaurant', area: 'uiTexts' }, count: 1, locales: ['ca'], examples: ['Textos de la web: nav.book'] },
      { type: 'translations', target: { kind: 'restaurant', area: 'search' }, count: 1, locales: ['ca'], examples: ['Título en Google'] }
    ]);
  });

  it('espacio, carta, bebidas, vinos y páginas legales', () => {
    const tasks = buildPendingTasks(src({
      spaces: [space({ hero: { title: half } })],
      dishCategories: [
        { id: 'c1', spaceId: 's1', name: half, order: 0, kind: 'dish' },
        { id: 'c2', spaceId: 's1', name: full, order: 0, kind: 'drink' }
      ],
      dishes: [
        { id: 'd1', spaceId: 's1', categoryId: 'c1', name: full, note: half, price: 1, order: 0, active: true, imageAssetId: null, imageGradient: 'g' },
        { id: 'd2', spaceId: 's1', categoryId: 'c1', name: full, price: 1, order: 1, active: true, imageAssetId: null, imageGradient: 'g' },
        { id: 'b1', spaceId: 's1', categoryId: 'c2', name: { es: 'Espresso' }, price: 2, order: 0, active: true, imageAssetId: null, imageGradient: 'g' }
      ],
      wineCategories: [{ id: 'w1', spaceId: 's1', name: full, order: 0 }],
      wines: [{ id: 'v1', spaceId: 's1', categoryId: 'w1', name: 'Rioja', region: null, note: half, priceGlass: 1, priceBottle: null, order: 0, active: true, imageGradient: 'g' }],
      legalPages: [{ id: 'l1', restaurantId: 'r1', type: 'privacy', title: full, content: half, lastUpdated: null, updatedAt: new Date() }]
    }));
    const at = { spaceId: 's1', spaceName: 'Sala' };
    expect(tasks.map(t => [t.type === 'translations' ? t.target : null, t.type === 'translations' ? t.count : 0])).toEqual([
      [{ kind: 'space', ...at }, 1],
      [{ kind: 'menu', menu: 'dishes', ...at }, 2],
      [{ kind: 'menu', menu: 'drinks', ...at }, 1],
      [{ kind: 'menu', menu: 'wines', ...at }, 1],
      [{ kind: 'legal', legalType: 'privacy' }, 1]
    ]);
    expect(tasks[2]).toMatchObject({ examples: ['Espresso'], locales: ['ca'] });
  });

  it('con un solo idioma no hay traducciones pendientes', () => {
    expect(buildPendingTasks(src({ restaurant: restaurant({ activeLocaleCodes: ['es'], about: { title: half } }) }))).toEqual([]);
  });

  it('fotos: solo cuentan las que están en uso y les falta descripción en un idioma activo', () => {
    const tasks = buildPendingTasks(src({
      restaurant: restaurant({ branding: { logoAssetId: 'logo' } }),
      spaces: [space({ gallery: ['g1', 'g2'] })],
      media: [media('logo', { es: 'Logo' }), media('g1', { es: 'a', ca: 'b' }), media('g2', {}), media('suelta', {})]
    }));
    expect(tasks).toEqual([{ type: 'image_descriptions', target: { kind: 'media' }, count: 2, locales: ['es', 'ca'] }]);
  });
});
