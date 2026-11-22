import type { Env } from '../../env.js';
import type { Container } from './compositionRoot.js';
import type { SessionUser } from '../../domain/models/user.js';
import type { Session } from '../../domain/models/session.js';

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
