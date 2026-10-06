import type { MediaRepository } from '../../domain/repositories/mediaRepository.js';
import type { MediaStorage } from '../../domain/services/mediaStorage.js';
import { MediaNotFoundError, MediaHasReferencesError } from '../../domain/models/media.js';

/**
 * Hard delete del media: pre-check de referencias (restrict), borra el
 * objeto R2 (idempotente) y luego la fila. El orden importa: si el delete
 * de R2 falla, el error lo loguea el adapter y la fila queda — mejor eso
 * que un fantasma huérfano en R2.
 */
export class DeleteMediaUseCase {
  constructor(
    private readonly media: MediaRepository,
    private readonly storage: MediaStorage
  ) {}

  async execute(id: string): Promise<void> {
    const m = await this.media.findById(id);
    if (!m) throw new MediaNotFoundError(id);

    const refs = await this.media.findReferences(id);
    if (refs.length > 0) throw new MediaHasReferencesError();

    try {
      await this.storage.delete(m.r2Key);
    } catch (err) {
      console.error('[media] R2 delete failed:', err);
    }
    await this.media.deleteById(id);
  }
}
