# middleware/

Middlewares HTTP transversales (se usan por varias rutas, no son específicos
de un recurso). Están separados aquí para que no vivan en `src/auth/` ni
en ninguna carpeta de recurso.

> ⚠️ No confundir con `src/auth/middleware.ts` que contiene `requireAuth`,
> `requireAdmin`, `requireRestaurant` — esos son específicos de la auth y
> viven ahí porque dependen del Lucia session.

## Archivos

| Archivo | Qué hace | Dónde se usa |
|---|---|---|
| `cache.ts` | `cacheHeaders({ maxAge, swr })` → Cache-Control + ETag + 304. `noCache` → fuerza no cachear | `languages/route.ts`, `restaurants/route.ts` (list + detail), `auth/route.ts` (session endpoints) |
| `rate-limit.ts` | Factory `rateLimit({ bucket, limit, windowSeconds, keyFn? })` + `cleanupStaleRateLimits()` | `app.ts` global (100/min), `auth/route.ts` (login 5/h, forgot 3/h) |
| `sentry.ts` | `sentryMiddleware()` → captura 500+ a Sentry con context (user, path, method) | `app.ts` global |

## Patterns

### Cache
```ts
import { cacheHeaders } from '../middleware/cache.js';
app.get('/', cacheHeaders({ maxAge: 30, swr: 120 }), async (c) => { ... });
```

### Rate limit per-endpoint
```ts
import { rateLimit } from '../middleware/rate-limit.js';
const limiter = rateLimit({ bucket: 'auth-login', limit: 5, windowSeconds: 3600 });
app.post('/login', limiter, async (c) => { ... });
```

### Keys compuestas (ej. IP + email)
Pasá `keyFn` a `rateLimit`:
```ts
rateLimit({
  bucket: 'auth-login',
  limit: 5,
  windowSeconds: 3600,
  keyFn: async (c) => `${ip}:${email}`
});
```
