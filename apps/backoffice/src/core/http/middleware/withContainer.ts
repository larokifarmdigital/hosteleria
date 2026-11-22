import { createMiddleware } from 'hono/factory';
import { buildContainer } from '../compositionRoot.js';
import type { AppBindings } from '../types.js';

export const withContainer = createMiddleware<AppBindings>(async (c, next) => {
  c.set('container', buildContainer(c.env));
  await next();
});
