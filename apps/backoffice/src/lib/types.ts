/**
 * Types del dominio — re-export desde `@hosteleria/api-client`.
 *
 * ANTES: types duplicados aquí y usados por los mocks. AHORA: la fuente
 * única es el package api-client, que refleja los DTOs del api. Así
 * componentes ↔ mock ↔ api usan exactamente los mismos shapes.
 *
 * Los tipos legacy (User con `initials`+`lastAccessRelative`, Task del
 * dashboard, MediaAsset con `restaurantSlug`+`gradient`) que solo existían
 * en el mockup y no vienen del api se mantienen abajo hasta que las
 * pantallas correspondientes se migren al api.
 */

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

// ─── Types legacy solo del mockup ────────────────────────────────
// Se mantienen mientras Media, Users y Dashboard usen mock-data.
// Cuando se migren al api, borrar y usar los tipos oficiales.

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
