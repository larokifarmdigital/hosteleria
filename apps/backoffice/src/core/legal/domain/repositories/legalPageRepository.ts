import type { LegalPage, LegalPageType } from '../models/legalPage';

export interface LegalPageRepository {
  listByRestaurantId(restaurantId: string): Promise<LegalPage[]>;

  /** Crea la página o sustituye la que hubiera de ese tipo. */
  upsert(
    restaurantId: string,
    type: LegalPageType,
    data: Pick<LegalPage, 'title' | 'content' | 'lastUpdated'>,
    actorId: string
  ): Promise<LegalPage>;

  delete(restaurantId: string, type: LegalPageType): Promise<void>;
}
