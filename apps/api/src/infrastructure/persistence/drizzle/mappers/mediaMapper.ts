import type { MediaAsset } from '../../../../domain/models/media.js';
import type { I18nValue } from '../../../../domain/models/i18n.js';
import type { mediaAssets } from '../schema/media.js';

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
    uploadedBy: row.uploadedBy
  };
}
