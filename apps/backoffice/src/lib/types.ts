export type {
  LocaleCode,
  I18nString,
  I18nText,
  Language,
  UserRole,
  Address,
  Contact,
  Socials,
  Seo,
  PublishState,
  Restaurant,
  SpaceType,
  ScheduleShift,
  ScheduleDay,
  Hero,
  Manifesto,
  Space,
  DishCategory,
  Dish,
  WineCategory,
  Wine,
  MediaUsage
} from '@hosteleria/api-client';

// Tipos del mockup que no vienen del api; hoy solo los usa `mock-data.ts`.

export interface User {
  id: string;
  name: string;
  email: string;
  initials: string;
  avatarColor: string;
  role: 'admin' | 'editor';
  restaurants: string[];
  lastAccessRelative: string;
}

export interface MediaAsset {
  id: string;
  name: string;
  sizeKb: number;
  restaurantSlug: string;
  usage: 'hero' | 'gallery' | 'dish' | 'unused';
  hasAltText: boolean;
  gradient: string;
}

export type TaskSeverity = 'critical' | 'warn';

export interface PendingTask {
  id: string;
  severity: TaskSeverity;
  title: string;
  body: string;
  actionLabel: string;
  actionHref: string;
}

export interface SystemService {
  id: string;
  label: string;
  status: 'ok' | 'warn' | 'down';
  meta?: string;
  detail?: string;
}

export interface RebuildRow {
  id: string;
  restaurant: string;
  status: 'ok' | 'warn';
  relative: string;
}
