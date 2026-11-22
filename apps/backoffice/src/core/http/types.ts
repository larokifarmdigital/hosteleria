import type { Env } from '@/core/shared';
import type { Container } from './compositionRoot';
import type { SessionUser, Session } from '@/core/auth';

export interface AppVars {
  env: Env;
  /** Los puebla `validateSession`. */
  user: SessionUser | null;
  session: Session | null;
  /** Lo cablea `withContainer`. */
  container: Container;
  /** Lo pone una ruta de escritura cuando su cambio se ve en la web; lo lee `rebuildSiteAfterWrite`. */
  rebuild?: { spaceId?: string; restaurantSlug?: string };
}

export type AppBindings = { Bindings: Env; Variables: AppVars };
