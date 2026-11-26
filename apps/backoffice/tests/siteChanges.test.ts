import { describe, expect, it } from 'vitest';
import { computeSiteChanges } from '@/core/site/domain';

const space = (id: string, order: number, isDefault = false) => ({ id, name: id, order, isDefault }) as never;
const cat = (id: string, order = 0, kind: 'dish' | 'drink' = 'dish', name = id) => ({ id, spaceId: 's1', name: { es: name }, order, kind });
const dish = (id: string, over: Record<string, unknown> = {}) => ({
  id, spaceId: 's1', categoryId: 'c1', name: { es: id }, note: {}, price: 10, order: 0, active: true, imageAssetId: null, imageGradient: '', ...over
});

function base() {
  return {
    spaces: [space('s1', 0, true), space('s2', 1)],
    dishCategories: [cat('c1')],
    dishes: [dish('d1'), dish('d2', { order: 1 })],
    wineCategories: [],
    wines: [],
    legalPages: [{ id: 'l1', restaurantId: 'r', type: 'privacy', title: { es: 'Privacidad' }, content: { es: 'Texto' }, lastUpdated: null, updatedAt: new Date() }]
  } as never as Parameters<typeof computeSiteChanges>[0];
}
const clone = <T>(v: T): T => structuredClone(v);

describe('computeSiteChanges', () => {
  it('sin copia publicada no hay marcas', () => {
    expect(computeSiteChanges(base(), null)).toMatchObject({ hasCopy: false, rows: {}, removed: [] });
  });

  it('igual que lo publicado: nada que marcar', () => {
    const c = computeSiteChanges(base(), base());
    expect(c).toMatchObject({ hasCopy: true, rows: {}, removed: [], legal: [], menuSpaceIds: [] });
    expect(c.spaces).toEqual({ order: false, isDefault: false, removed: [] });
  });

  it('un precio cambiado es un cambio con el precio de antes', () => {
    const draft = clone(base());
    draft.dishes[0]!.price = 12;
    const c = computeSiteChanges(draft, base());
    expect(c.rows.d1).toEqual({ status: 'changed', before: { price: 10 } });
    expect(c.menuSpaceIds).toEqual(['s1']);
  });

  it('un plato nuevo visible es nuevo; uno nuevo oculto no cambia la web', () => {
    const draft = clone(base());
    draft.dishes.push(dish('d3', { order: 2 }) as never, dish('d4', { order: 3, active: false }) as never);
    const c = computeSiteChanges(draft, base());
    expect(c.rows.d3).toEqual({ status: 'new' });
    expect(c.rows.d4).toBeUndefined();
    // La categoría también cambia: tiene un plato más.
    expect(c.rows.c1).toEqual({ status: 'changed' });
  });

  it('ocultar un plato cambia la web; editar uno oculto, no', () => {
    const published = clone(base());
    published.dishes[1]!.active = false;
    const draft = clone(published);
    draft.dishes[1]!.price = 99;
    draft.dishes[0]!.active = false;
    const c = computeSiteChanges(draft, published);
    expect(c.rows.d1).toEqual({ status: 'changed' });
    expect(c.rows.d2).toBeUndefined();
  });

  it('un plato borrado se quitará al publicar', () => {
    const draft = clone(base());
    draft.dishes = draft.dishes.filter(d => d.id !== 'd2');
    const c = computeSiteChanges(draft, base());
    expect(c.removed).toEqual([expect.objectContaining({ id: 'd2', kind: 'dish', categoryId: 'c1', price: 10 })]);
  });

  it('cambiar el orden marca la categoría', () => {
    const draft = clone(base());
    draft.dishes[0]!.order = 5;
    expect(computeSiteChanges(draft, base()).rows.c1).toEqual({ status: 'changed' });
  });

  it('legales, orden de espacios, principal y espacios borrados', () => {
    const draft = clone(base());
    draft.legalPages[0]!.content = { es: 'Otro texto' };
    draft.spaces = [space('s2', 0, true)];
    const published = clone(base());
    const c = computeSiteChanges(draft, published);
    expect(c.legal).toEqual(['privacy']);
    expect(c.spaces.isDefault).toBe(true);
    expect(c.spaces.removed).toEqual([{ id: 's1', name: 's1' }]);
  });

  it('el orden de las claves de jsonb no cuenta como cambio', () => {
    const draft = clone(base());
    draft.dishes[0]!.name = { en: 'x', es: 'd1' } as never;
    const published = clone(base());
    published.dishes[0]!.name = { es: 'd1', en: 'x' } as never;
    expect(computeSiteChanges(draft, published).rows).toEqual({});
  });
});

describe('computeSiteChanges, empates de orden', () => {
  it('dos platos con el mismo orden no cuentan como cambio aunque lleguen en otro orden', () => {
    const published = clone(base());
    published.dishes.forEach(d => { d.order = 0; });
    const draft = clone(published);
    draft.dishes.reverse();
    expect(computeSiteChanges(draft, published).rows).toEqual({});
  });
});
