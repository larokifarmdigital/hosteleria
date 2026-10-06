import type { Env } from '../../env.js';
import type { Container } from './compositionRoot.js';
import type { AuthVars } from '../../auth/middleware.js';

/**
 * Context variables para las rutas nuevas (thin).
 *
 * Extiende las de la auth antigua (`AuthVars`: env + user + session) con el
 * `container` cablado por `withContainer`. Las rutas thin solo tocan
 * `c.get('container').<module>.<useCase>.execute(...)`.
 */
export type AppVars = AuthVars & {
  container: Container;
};

export type AppBindings = { Bindings: Env; Variables: AppVars };
