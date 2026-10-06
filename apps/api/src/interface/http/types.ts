import type { Env } from '../../env.js';
import type { Container } from './compositionRoot.js';
import type { SessionUser } from '../../domain/models/user.js';
import type { Session } from '../../domain/models/session.js';

/**
 * Context variables para las rutas thin.
 *
 *  - `env` — expuesto como Variable por compat con helpers legacy; el nuevo
 *    código puede usar `c.env` directamente.
 *  - `user` / `session` — las puebla `validateSession` leyendo la cookie.
 *  - `container` — cableado por `withContainer`. Las rutas tocan solo
 *    `c.get('container').<module>.<useCase>.execute(...)`.
 */
export interface AppVars {
  env: Env;
  user: SessionUser | null;
  session: Session | null;
  container: Container;
}

export type AppBindings = { Bindings: Env; Variables: AppVars };
