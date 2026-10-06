import type { MediaAsset } from '../../../domain/models/media.js';
import type { Restaurant } from '../../../domain/models/restaurant.js';

/**
 * Serializa `MediaAsset` + lookup del restaurant (slug/name) y el
 * `publicUrl` compuesto desde `R2_PUBLIC_URL + r2Key`.
 */
export function mediaToDto(m: MediaAsset, r2PublicUrl: string, restaurant: Restaurant | null) {
  return {
    id: m.id,
    name: m.name,
    r2Key: m.r2Key,
    publicUrl: `${r2PublicUrl.replace(/\/$/, '')}/${m.r2Key}`,
    mimeType: m.mimeType,
    sizeKb: m.sizeKb,
    width: m.width,
    height: m.height,
    usage: m.usage,
    hasAltText: m.hasAltText,
    altText: m.altText,
    restaurantSlug: restaurant?.slug ?? null,
    restaurantName: restaurant?.name ?? null,
    uploadedBy: m.uploadedBy,
    createdAt: m.createdAt.toISOString()
  };
}
