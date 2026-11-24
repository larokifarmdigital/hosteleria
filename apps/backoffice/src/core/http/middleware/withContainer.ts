import { createMiddleware } from 'hono/factory';
import { getContainer } from '../compositionRoot';
import type { AppBindings } from '../types';

export const withContainer = createMiddleware<AppBindings>(async (c, next) => {
  c.set('container', getContainer());
  await next();
});
