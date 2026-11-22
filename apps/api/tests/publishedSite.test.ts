import { describe, it, expect } from 'vitest';
import { buildPublishedSite, publishedSiteMediaIds } from '../src/domain/models/publishedSite.js';
import type { Restaurant } from '../src/domain/models/restaurant.js';
import type { Space } from '../src/domain/models/space.js';
import type { Dish, DishCategory } from '../src/domain/models/dish.js';
import type { Wine, WineCategory } from '../src/domain/models/wine.js';
import type { MediaAsset } from '../src/domain/models/media.js';

const t = (s: string) => ({ es: s, ca: s + ' (ca)' });

function restaurant(over: Partial<Restaurant> = {}): Restaurant {
  return {
    id: 'r1', slug: 'prueba', name: 'Borrador', domain: 'prueba.cat', logoInitial: 'P', coverGradient: 'g',
    state: 'draft', defaultLocaleCode: 'es', activeLocaleCodes: ['es', 'ca', 'en'],
    acceptsBookings: true, showSocials: true, timezone: 'Europe/Madrid',
    rebuildHookUrl: 'https://hook.example/secreto',
    address: { city: 'Borrador' }, contact: {}, socials: {}, seo: { title: t('Borrador') },
    foundedYear: 2001, branding: { logoAssetId: 'logo-borrador' }, homeBlocks: [], about: { title: t('Borrador') },
    groups: {}, mapUrl: null, showReviews: false, uiTexts: {}, faq: {}, aiSummary: {}, analyticsToken: 'tok-borrador',
    business: {}, lastPublishedAt: new Date('2026-11-20T10:00:00Z'),
    publishedSnapshot: {
      name: 'Publicado', domain: 'prueba.cat', logoInitial: 'P', coverGradient: 'g', timezone: 'Europe/Madrid',
      address: { city: 'Barcelona' }, contact: { phone: '930' }, socials: {}, seo: { title: t('Publicado'), imageAssetId: 'share' },
      acceptsBookings: true, showSocials: false,
      activeLocaleCodes: ['es', 'ca'], defaultLocaleCode: 'ca'
    },
    spacesCount: 2, dishesCount: 0, winesCount: 0,
    ...over
  };
}

function space(over: Partial<Space> = {}): Space {
  return {
    id: 's1', restaurantId: 'r1', slug: 'sala', name: 'Sala (borrador)', type: 'restaurant', isDefault: true, order: 0,
    state: 'draft', coverGradient: 'g', descriptor: '', hero: { title: t('Borrador'), imageAssetId: 'hero-borrador' },
    manifesto: {}, gallery: ['gal-borrador'], scheduleTexts: {}, address: {}, mapUrl: null, bookingContact: {},
    schedule: [{ day: 'Mo', shifts: [{ open: '09:00', close: '10:00' }] }],
    publishedSnapshot: {
      name: 'Sala', hero: { title: t('Publicado'), imageAssetId: 'hero' }, manifesto: {}, descriptor: 'd', coverGradient: 'g',
      gallery: ['gal1', 'gal2'],
      schedule: [{ day: 'Fr', shifts: [{ open: '13:00', close: '16:00' }] }]
    },
    ...over
  };
}

const asset = (id: string, over: Partial<MediaAsset> = {}): MediaAsset => ({
  id, restaurantId: 'r1', name: id, sizeKb: 1, width: 800, height: 600, mimeType: 'image/webp', r2Key: `prueba/${id}.webp`,
  usage: 'unused', hasAltText: true, altText: t(id), createdAt: new Date(), confirmedAt: new Date(), uploadedBy: null, ...over
});

const cat = (id: string, spaceId: string, order: number, kind: DishCategory['kind'] = 'dish'): DishCategory => ({ id, spaceId, name: t(id), order, kind });
const dish = (id: string, categoryId: string, over: Partial<Dish> = {}): Dish => ({
  id, spaceId: 's1', categoryId, name: t(id), price: 10, order: 0, active: true, imageAssetId: null, imageGradient: 'g', ...over
});
const wineCat = (id: string, spaceId: string): WineCategory => ({ id, spaceId, name: t(id), order: 0 });
const wine = (id: string, categoryId: string, over: Partial<Wine> = {}): Wine => ({
  id, spaceId: 's1', categoryId, name: id, region: null, priceGlass: 4, priceBottle: 20, order: 0, active: true, imageGradient: 'g', ...over
});

const empty = { dishCategories: [], dishes: [], wineCategories: [], wines: [], legalPages: [] };

describe('sitio publicado', () => {
  it('un restaurante sin publicar no tiene sitio', () => {
    expect(buildPublishedSite({ restaurant: restaurant({ publishedSnapshot: null }), spaces: [space()], ...empty }, [], 'https://m')).toBeNull();
  });

  it('sale lo publicado y nada del borrador', () => {
    const site = buildPublishedSite({ restaurant: restaurant(), spaces: [space()], ...empty }, [], 'https://m')!;
    expect(site.restaurant.name).toBe('Publicado');
    expect(site.restaurant.address).toEqual({ city: 'Barcelona' });
    expect(site.restaurant.seo.title).toEqual(t('Publicado'));
    expect(site.spaces[0].name).toBe('Sala');
    expect(site.spaces[0].hero.title).toEqual(t('Publicado'));
    expect(site.spaces[0].gallery).toEqual(['gal1', 'gal2']);
    expect(JSON.stringify(site)).not.toMatch(/[Bb]orrador/);
  });

  it('los campos que el snapshot no trae van vacíos, no con el borrador', () => {
    const site = buildPublishedSite({ restaurant: restaurant(), spaces: [], ...empty }, [], 'https://m')!;
    expect(site.restaurant.foundedYear).toBeNull();
    expect(site.restaurant.branding).toEqual({});
    expect(site.restaurant.about).toEqual({});
    expect(site.restaurant.analyticsToken).toBeNull();
  });

  it('no enseña datos internos', () => {
    const site = buildPublishedSite({ restaurant: restaurant(), spaces: [space()], ...empty }, [], 'https://m')!;
    const json = JSON.stringify(site);
    expect(json).not.toContain('secreto');
    expect(json).not.toContain('publishedSnapshot');
    expect(json).not.toContain('"state"');
  });

  it('idiomas y fecha son los de la publicación', () => {
    const site = buildPublishedSite({ restaurant: restaurant(), spaces: [], ...empty }, [], 'https://m')!;
    expect(site.restaurant.defaultLocale).toBe('ca');
    expect(site.restaurant.activeLocales).toEqual(['ca', 'es']);
    expect(site.restaurant.locales).toEqual([{ code: 'ca', name: 'ca' }, { code: 'es', name: 'es' }]);
    const named = buildPublishedSite({
      restaurant: restaurant({ publishedSnapshot: { ...restaurant().publishedSnapshot, activeLocaleCodes: ['es', 'en', 'ca'] } }),
      spaces: [], ...empty, languages: [{ code: 'es', name: 'Español' }, { code: 'ca', name: 'Català' }, { code: 'en', name: 'English' }]
    }, [], 'https://m')!;
    expect(named.restaurant.locales).toEqual([
      { code: 'ca', name: 'Català' }, { code: 'en', name: 'English' }, { code: 'es', name: 'Español' }
    ]);
    expect(site.restaurant.publishedAt).toBe('2026-11-20T10:00:00.000Z');
  });

  it('solo los espacios publicados, en su orden, con el horario publicado de la semana entera', () => {
    const site = buildPublishedSite({
      restaurant: restaurant(),
      spaces: [
        space({ id: 's3', slug: 'terraza', order: 2 }),
        space({ id: 's2', slug: 'nuevo', order: 1, publishedSnapshot: null }),
        space()
      ],
      ...empty
    }, [], 'https://m')!;
    expect(site.spaces.map(s => s.slug)).toEqual(['sala', 'terraza']);
    const schedule = site.spaces[0].schedule;
    expect(schedule.map(d => d.day)).toEqual(['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']);
    expect(schedule.find(d => d.day === 'Fr')!.shifts).toEqual([{ open: '13:00', close: '16:00' }]);
    expect(schedule.find(d => d.day === 'Mo')!.shifts).toEqual([]);
  });

  it('la carta: por categoría y en orden, sin lo inactivo, sin categorías vacías ni de espacios sin publicar', () => {
    const site = buildPublishedSite({
      restaurant: restaurant(),
      spaces: [space(), space({ id: 's2', slug: 'nuevo', order: 1, publishedSnapshot: null })],
      dishCategories: [cat('segundos', 's1', 1), cat('entrantes', 's1', 0), cat('vacia', 's1', 2), cat('oculta', 's2', 0)],
      dishes: [
        dish('b', 'entrantes', { order: 1 }), dish('a', 'entrantes', { order: 0 }),
        dish('fuera', 'entrantes', { active: false }), dish('c', 'segundos'),
        dish('apagado', 'vacia', { active: false }), dish('otro', 'oculta', { spaceId: 's2' })
      ],
      wineCategories: [wineCat('tintos', 's1'), wineCat('blancos', 's1')],
      wines: [wine('rioja', 'tintos'), wine('agotado', 'blancos', { active: false })],
      legalPages: []
    }, [], 'https://m')!;
    expect(site.spaces).toHaveLength(1);
    expect(site.spaces[0].dishCategories.map(c => [c.id, c.dishes.map(d => d.id)])).toEqual([
      ['entrantes', ['a', 'b']], ['segundos', ['c']]
    ]);
    expect(site.spaces[0].wineCategories.map(c => [c.id, c.wines.map(w => w.id)])).toEqual([['tintos', ['rioja']]]);
    expect(JSON.stringify(site)).not.toContain('otro');
  });

  it('las bebidas van en su propia carta, con la misma forma', () => {
    const site = buildPublishedSite({
      restaurant: restaurant(), spaces: [space()],
      dishCategories: [cat('entrantes', 's1', 0), cat('cafes', 's1', 1, 'drink'), cat('cocteles', 's1', 0, 'drink')],
      dishes: [dish('a', 'entrantes'), dish('espresso', 'cafes', { price: 2.2 }), dish('negroni', 'cocteles'), dish('agotado', 'cocteles', { active: false })],
      wineCategories: [], wines: [], legalPages: []
    }, [], 'https://m')!;
    expect(site.spaces[0].dishCategories.map(c => c.id)).toEqual(['entrantes']);
    expect(site.spaces[0].drinkCategories.map(c => [c.id, c.drinks.map(d => d.id)])).toEqual([['cocteles', ['negroni']], ['cafes', ['espresso']]]);
    expect(site.spaces[0].drinkCategories[1].drinks[0].price).toBe(2.2);
  });

  it('imágenes: solo las publicadas, confirmadas y del restaurante', () => {
    const src = {
      restaurant: restaurant(),
      spaces: [space(), space({ id: 's2', slug: 'nuevo', order: 1, publishedSnapshot: null, hero: { imageAssetId: 'hero-nuevo' } })],
      dishCategories: [cat('entrantes', 's1', 0)],
      dishes: [
        dish('a', 'entrantes', { imageAssetId: 'plato' }),
        dish('fuera', 'entrantes', { active: false, imageAssetId: 'plato-inactivo' })
      ],
      wineCategories: [], wines: [], legalPages: []
    };
    expect(publishedSiteMediaIds(src).sort()).toEqual(['gal1', 'gal2', 'hero', 'plato', 'share']);

    const site = buildPublishedSite(src, [
      asset('hero'), asset('share'), asset('plato'),
      asset('gal1', { confirmedAt: null }),
      asset('gal2', { restaurantId: 'otro' }),
      asset('logo-borrador')
    ], 'https://m.example/')!;
    expect(Object.keys(site.media).sort()).toEqual(['hero', 'plato', 'share']);
    expect(site.media.hero).toEqual({
      url: 'https://m.example/prueba/hero.webp', width: 800, height: 600, mimeType: 'image/webp', alt: t('hero')
    });
  });

  it('las páginas legales salen sin datos internos', () => {
    const site = buildPublishedSite({
      restaurant: restaurant(), spaces: [], ...empty,
      legalPages: [{ id: 'l1', restaurantId: 'r1', type: 'privacy', title: t('Privacidad'), content: t('## Texto'), lastUpdated: '2026-11-20', updatedAt: new Date() }]
    }, [], 'https://m')!;
    expect(site.legalPages).toEqual([{ type: 'privacy', title: t('Privacidad'), content: t('## Texto'), lastUpdated: '2026-11-20' }]);
  });
});
