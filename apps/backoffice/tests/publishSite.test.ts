import { describe, expect, it } from 'vitest';
import { PublishSiteUseCase } from '@/core/site';

const all = (t: string) => ({ es: t, en: `${t} (en)` });

function setup(over: { restaurant?: Record<string, unknown>; spaces?: Record<string, unknown>[] } = {}) {
  const calls: string[] = [];
  const restaurant = {
    id: 'r1', slug: 'pruebas', state: 'draft', publishedSnapshot: { name: 'x' }, activeLocaleCodes: ['es', 'en'],
    about: { title: all('Historia') }, ...over.restaurant
  };
  const spaces = (over.spaces ?? [
    { id: 's1', name: 'Comedor', state: 'draft', publishedSnapshot: {}, hero: { title: all('Portada') } },
    { id: 's2', name: 'Terraza', state: 'published', publishedSnapshot: {}, hero: { title: all('Terraza') } }
  ]);
  const useCase = new PublishSiteUseCase(
    { findBySlug: async () => restaurant } as never,
    { listByRestaurantId: async () => spaces } as never,
    { execute: async (slug: string) => { calls.push(`restaurant:${slug}`); return { id: 'r1' }; } },
    { execute: async (_r: string, id: string) => { calls.push(`space:${id}`); return {} as never; } }
  );
  return { useCase, calls };
}

describe('PublishSiteUseCase', () => {
  it('publica los espacios con cambios y después la ficha', async () => {
    const { useCase, calls } = setup();
    const result = await useCase.execute('pruebas', 'u1');
    expect(calls).toEqual(['space:s1', 'restaurant:pruebas']);
    expect(result).toEqual({ restaurant: true, spaces: [{ id: 's1', name: 'Comedor' }] });
  });

  it('incluye lo que nunca se publicó y deja fuera lo que está al día', async () => {
    const { useCase, calls } = setup({
      restaurant: { state: 'published' },
      spaces: [{ id: 'nuevo', name: 'Barra', state: 'published', publishedSnapshot: null, hero: {} }]
    });
    const result = await useCase.execute('pruebas', 'u1');
    expect(calls).toEqual(['space:nuevo']);
    expect(result.restaurant).toBe(false);
  });

  it('sin nada pendiente no publica nada', async () => {
    const { useCase, calls } = setup({ restaurant: { state: 'published' }, spaces: [] });
    expect(await useCase.execute('pruebas', 'u1')).toEqual({ restaurant: false, spaces: [] });
    expect(calls).toEqual([]);
  });

  it('si falta una traducción en cualquier parte no publica nada y dice dónde', async () => {
    const { useCase, calls } = setup({
      spaces: [{ id: 's1', name: 'Comedor', state: 'draft', publishedSnapshot: {}, hero: { title: { es: 'Solo en español' } } }]
    });
    await expect(useCase.execute('pruebas', 'u1')).rejects.toMatchObject({
      code: 'TRANSLATIONS_INCOMPLETE',
      fields: expect.arrayContaining([expect.stringMatching(/^Comedor · /)])
    });
    expect(calls).toEqual([]);
  });
});
