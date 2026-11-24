import { describe, expect, it } from 'vitest';
import { ConfirmMediaUploadUseCase } from '@/core/media';

function setup(head: { sizeBytes: number; contentType?: string } | null) {
  const deleted: string[] = [];
  const asset = { id: 'm1', sizeKb: 2, mimeType: 'image/webp', r2Key: 'pruebas/2026/foto.webp' };
  const media = {
    findById: async () => asset,
    deleteById: async (id: string) => { deleted.push(`row:${id}`); },
    confirmUpload: async () => ({ ...asset, confirmedAt: new Date() })
  };
  const storage = { head: async () => head, delete: async (key: string) => { deleted.push(`obj:${key}`); } };
  return { deleted, useCase: new ConfirmMediaUploadUseCase(media as never, storage as never) };
}

describe('ConfirmMediaUploadUseCase', () => {
  it('confirma si el objeto tiene el tamaño y el tipo pedidos', async () => {
    const { useCase, deleted } = setup({ sizeBytes: 1500, contentType: 'image/webp' });
    await expect(useCase.execute('m1', {})).resolves.toMatchObject({ id: 'm1' });
    expect(deleted).toEqual([]);
  });

  it('rechaza y limpia si el tamaño no coincide', async () => {
    const { useCase, deleted } = setup({ sizeBytes: 9000, contentType: 'image/webp' });
    await expect(useCase.execute('m1', {})).rejects.toMatchObject({ code: 'UPLOAD_SIZE_MISMATCH' });
    expect(deleted).toEqual(['row:m1', 'obj:pruebas/2026/foto.webp']);
  });

  it('rechaza y limpia si el tipo no coincide', async () => {
    const { useCase, deleted } = setup({ sizeBytes: 1500, contentType: 'text/html' });
    await expect(useCase.execute('m1', {})).rejects.toMatchObject({ code: 'UPLOAD_SIZE_MISMATCH' });
    expect(deleted).toHaveLength(2);
  });
});
