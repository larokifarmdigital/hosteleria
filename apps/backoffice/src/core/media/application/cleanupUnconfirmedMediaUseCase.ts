import type { MediaRepository } from '../domain/repositories/mediaRepository';
import type { MediaStorage } from '../domain/services/mediaStorage';

// La URL firmada caduca a los 5 minutos; un día de margen descarta cualquier
// subida que aún pudiera confirmarse.
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Borra las subidas que nunca se confirmaron (pestaña cerrada, navegador
 *  caído): la fila y, si llegó a subirse, el objeto en R2. */
export class CleanupUnconfirmedMediaUseCase {
  constructor(
    private readonly media: MediaRepository,
    private readonly storage: MediaStorage
  ) {}

  async execute(now: Date = new Date()): Promise<number> {
    const stale = await this.media.listUnconfirmedBefore(new Date(now.getTime() - MAX_AGE_MS));
    let deleted = 0;
    for (const asset of stale) {
      try {
        // Primero el objeto: si R2 falla, la fila queda y se reintenta mañana.
        await this.storage.delete(asset.r2Key);
        await this.media.deleteById(asset.id);
        deleted++;
      } catch (err) {
        console.error('[media] cleanup failed:', asset.id, err);
      }
    }
    return deleted;
  }
}
