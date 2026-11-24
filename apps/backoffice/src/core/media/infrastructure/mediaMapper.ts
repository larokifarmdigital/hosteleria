import type { MediaAsset } from '../domain/models/media';
import type { I18nValue } from '@/core/shared';
import type { mediaAssets } from '@/core/shared/infrastructure/drizzle/schema';

export function rowToMedia(row: typeof mediaAssets.$inferSelect): MediaAsset {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    name: row.name,
    sizeKb: row.sizeKb,
    width: row.width,
    height: row.height,
    mimeType: row.mimeType,
    r2Key: row.r2Key,
    usage: row.usage,
    hasAltText: row.hasAltText,
    altText: (row.altText as I18nValue) ?? {},
    createdAt: row.createdAt,
    confirmedAt: row.confirmedAt,
    uploadedBy: row.uploadedBy
  };
}
