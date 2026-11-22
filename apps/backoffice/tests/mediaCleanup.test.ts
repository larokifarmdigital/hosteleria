import { describe, it, expect } from 'vitest';
import { CleanupUnconfirmedMediaUseCase } from '@/core/media';
import type { MediaRepository, MediaStorage, MediaAsset } from '@/core/media/domain';

const asset = (id: string): MediaAsset => ({ id, r2Key: `ocana/2026/${id}.webp` }) as MediaAsset;

function setup(stale: MediaAsset[], failingKey?: string) {
  const calls = { before: null as Date | null, storage: [] as string[], rows: [] as string[] };
  const media = {
    listUnconfirmedBefore: async (before: Date) => { calls.before = before; return stale; },
    deleteById: async (id: string) => { calls.rows.push(id); }
  } as unknown as MediaRepository;
  const storage = {
    delete: async (key: string) => {
      if (key === failingKey) throw new Error('R2 down');
      calls.storage.push(key);
    }
  } as unknown as MediaStorage;
  return { calls, useCase: new CleanupUnconfirmedMediaUseCase(media, storage) };
}

describe('CleanupUnconfirmedMediaUseCase', () => {
  it('solo pide las subidas de hace más de un día', async () => {
    const { calls, useCase } = setup([]);
    const now = new Date('2026-11-21T04:00:00Z');
    expect(await useCase.execute(now)).toBe(0);
    expect(calls.before?.toISOString()).toBe('2026-11-20T04:00:00.000Z');
  });

  it('borra el objeto y la fila de cada subida sin confirmar', async () => {
    const { calls, useCase } = setup([asset('a'), asset('b')]);
    expect(await useCase.execute()).toBe(2);
    expect(calls.storage).toEqual(['ocana/2026/a.webp', 'ocana/2026/b.webp']);
    expect(calls.rows).toEqual(['a', 'b']);
  });

  it('si R2 falla conserva la fila y sigue con las demás', async () => {
    const { calls, useCase } = setup([asset('a'), asset('b')], 'ocana/2026/a.webp');
    expect(await useCase.execute()).toBe(1);
    expect(calls.rows).toEqual(['b']);
  });
});
