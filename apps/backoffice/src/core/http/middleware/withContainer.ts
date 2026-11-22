import { createMiddleware } from 'hono/factory';
import { buildContainer } from '../compositionRoot';
import type { AppBindings } from '../types';

export const withContainer = createMiddleware<AppBindings>(async (c, next) => {
  c.set('container', buildContainer(c.env));
  await next();
});
