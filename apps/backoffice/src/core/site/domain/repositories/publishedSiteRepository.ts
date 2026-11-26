import type { SiteCopy } from '../models/siteCopy';

export interface StoredSiteCopy {
  copy: SiteCopy;
  publishedAt: Date;
}

export interface PublishedSiteRepository {
  find(restaurantId: string): Promise<StoredSiteCopy | null>;
  save(restaurantId: string, copy: SiteCopy, actorId: string | null): Promise<void>;
  /** Ids de las fotos de todas las copias: siguen en alguna web aunque el borrador ya no las use. */
  listMediaIds(): Promise<string[]>;
}
