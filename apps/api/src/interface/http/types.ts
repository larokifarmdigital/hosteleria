import type { Env } from '../../env.js';
import type { Container } from './compositionRoot.js';
import type { SessionUser } from '../../domain/models/user.js';
import type { Session } from '../../domain/models/session.js';

export interface AppVars {
  env: Env;
  /** Pueblan `validateSession` tras leer la cookie. */
  user: SessionUser | null;
  session: Session | null;
  /** Cablea `withContainer`; las rutas tocan `c.get('container').<module>.<uc>.execute(...)`. */
  container: Container;
}

export type AppBindings = { Bindings: Env; Variables: AppVars };
