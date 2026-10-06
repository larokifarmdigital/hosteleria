import type { MediaRepository } from '../../domain/repositories/mediaRepository.js';
import type { MediaStorage } from '../../domain/services/mediaStorage.js';
import { MediaNotFoundError, MediaHasReferencesError } from '../../domain/models/media.js';

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

    // Primero el objeto, luego la fila: si el DELETE de R2 falla, la fila
    // queda y el admin puede reintentar. El orden inverso dejaría un
    // fantasma huérfano en R2 que ya nadie podría borrar.
    try {
      await this.storage.delete(m.r2Key);
    } catch (err) {
      console.error('[media] R2 delete failed:', err);
    }
    await this.media.deleteById(id);
  }
}
