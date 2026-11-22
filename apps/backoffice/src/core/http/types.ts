import type { Container } from './compositionRoot';
import type { SessionUser, Session } from '@/core/auth';

export interface AppVars {
  /** Los puebla `validateSession`. */
  user: SessionUser | null;
  session: Session | null;
  /** Lo cablea `withContainer`. */
  container: Container;
  /** Lo pone una ruta de escritura cuando su cambio se ve en la web; lo lee `rebuildSiteAfterWrite`. */
  rebuild?: { spaceId?: string; restaurantSlug?: string };
  /** Lo pone `createApp` si quien la monta sabe aplazar trabajo; sin él, el aviso de rebuild se espera. */
  defer?: Defer;
}

export type AppBindings = { Variables: AppVars };

/** Ejecuta una tarea cuando la respuesta ya ha salido (`after()` de Next). */
export type Defer = (task: () => Promise<void>) => void;
