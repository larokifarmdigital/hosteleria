import { createHash } from 'node:crypto';
import type { PublishedSite } from './publishedSite';
import type { SiteBuildInfo } from '../services/siteProbe';

/**
 * Versión del contenido publicado: cambia con cualquier cosa que la web enseña.
 * Es el mismo valor que el `ETag` de la lectura pública, que la landing guarda al construirse.
 */
export function siteVersion(site: PublishedSite): string {
  return createHash('sha256').update(JSON.stringify(site)).digest('hex').slice(0, 16);
}

/** `https://` + dominio, o `null` si el dominio guardado no es un nombre de host público. */
export function siteUrlOf(domain: string): string | null {
  const host = domain.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '').toLowerCase();
  const isHostname = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(host);
  const isIp = /^[\d.]+$/.test(host);
  return isHostname && !isIp && !host.endsWith('.local') && !host.endsWith('.internal') ? `https://${host}` : null;
}

export type SiteState =
  /** La web enseña lo último publicado. */
  | 'up_to_date'
  /** Hay cambios que la web aún no enseña y se pidió regenerarla hace poco. */
  | 'updating'
  /** Hay cambios que la web no enseña y ya debería haberse regenerado. */
  | 'outdated'
  /** No se ha podido leer la web: no responde o no dice con qué contenido se construyó. */
  | 'unknown'
  /** El restaurante no se ha publicado nunca. */
  | 'unpublished';

export interface SiteStatus {
  state: SiteState;
  siteUrl: string | null;
  builtAt: string | null;
  lastRebuildAt: string | null;
  /** Si la última petición de regenerar fue aceptada; `null` si no se ha pedido nunca. */
  lastRebuildOk: boolean | null;
  /** Sin hook, la web no se regenera sola. */
  canRebuild: boolean;
}

/** Un build tarda uno o dos minutos; pasado este margen, algo ha fallado. */
export const REBUILD_GRACE_MS = 6 * 60_000;

export function resolveSiteState(input: {
  currentVersion: string;
  build: SiteBuildInfo | null;
  lastRebuildAt: Date | null;
  lastRebuildOk: boolean | null;
  now: Date;
}): SiteState {
  const { currentVersion, build, lastRebuildAt, lastRebuildOk, now } = input;
  if (!build?.version) return 'unknown';
  if (build.version === currentVersion) return 'up_to_date';
  const recent = !!lastRebuildAt && now.getTime() - lastRebuildAt.getTime() < REBUILD_GRACE_MS;
  return recent && lastRebuildOk !== false ? 'updating' : 'outdated';
}
