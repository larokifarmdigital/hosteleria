import type { Space, SpaceSnapshot, Hero, Manifesto, ScheduleDay } from '../domain/models/space';

export interface SpaceRow {
  id: string;
  restaurantId: string;
  slug: string;
  name: string;
  type: Space['type'];
  isDefault: boolean;
  order: number;
  state: 'published' | 'draft' | 'warnings' | 'new';
  coverGradient: string;
  descriptor: string;
  hero: unknown;
  manifesto: unknown;
  gallery?: unknown;
  scheduleTexts?: unknown;
  address?: unknown;
  mapUrl?: string | null;
  bookingContact?: unknown;
  publishedSnapshot: unknown;
  schedule?: ScheduleDay[];
}

export function rowToSpace(row: SpaceRow): Space {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    slug: row.slug,
    name: row.name,
    type: row.type,
    isDefault: row.isDefault,
    order: row.order,
    state: row.state,
    coverGradient: row.coverGradient,
    descriptor: row.descriptor,
    hero: (row.hero as Hero) ?? {},
    manifesto: (row.manifesto as Manifesto) ?? {},
    gallery: (row.gallery as string[]) ?? [],
    scheduleTexts: (row.scheduleTexts as Space['scheduleTexts']) ?? {},
    address: (row.address as Space['address']) ?? {},
    mapUrl: row.mapUrl ?? null,
    bookingContact: (row.bookingContact as Space['bookingContact']) ?? {},
    schedule: row.schedule ?? [],
    publishedSnapshot: (row.publishedSnapshot as SpaceSnapshot | null) ?? null
  };
}
