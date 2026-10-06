# Arquitectura — @hosteleria/api

Tour guiado del proyecto en 1 página. Para detalles de un módulo, mirá el
`README.md` de su carpeta.

- Deploy → [`DEPLOY.md`](./DEPLOY.md)
- Correr local → [`README.md`](./README.md)
- Esto → cómo está organizado el código y por qué

---

## Stack

```
Browser / Backoffice (Next.js)
         │  HTTP + cookie Lucia (hs_session)
         ▼
┌─────────────────────────────────────┐
│  Cloudflare Worker                  │
│  ─────────────────                  │
│  src/index.ts     ← entry           │
│    ├── fetch  → Hono app            │
│    └── scheduled → cron handlers    │
│                                     │
│  Hono route tree:                   │
│    /auth/*         src/auth/        │
│    /restaurants/*  src/restaurants/ │
│    /spaces/*       src/spaces/      │
│    /dishes/*       src/dishes/      │
│    /wines/*        src/wines/       │
│    /languages/*    src/languages/   │
│    /users/*        src/users/       │
│    /media/*        src/media/       │
└─────────────────────────────────────┘
         │              │
         │ Drizzle      │ R2 binding (env.MEDIA)
         ▼              ▼
     Neon Postgres   Cloudflare R2 (hostelery)
```

**Elecciones principales**:
- **Hono** — framework HTTP compacto, hecho para Workers (su autor trabajó para esquivar las restricciones de este runtime).
- **Drizzle ORM** sobre **Neon Postgres** (serverless, con transacciones vía `neon-serverless` + WebSocket nativo de Workers).
- **Lucia** para sesiones (cookie HTTP-only `hs_session`).
- **@noble/hashes/scrypt** para hashing de passwords (pure JS — Workers no permite WASM dinámico, no permite argon2 nativo, cappea PBKDF2 a 100k).
- **Cloudflare R2** para media (binding nativo + signed URLs para uploads cliente→R2 directo).
- **Scalar** sirve la UI interactiva de `/openapi.json` en `/docs`.

---

## Capas (de dentro hacia afuera)

```
┌─────────────────────────────────────────┐
│  HTTP (route.ts)                        │  thin — valida + llama al service
│  "¿Qué expone el api?"                  │
├─────────────────────────────────────────┤
│  Service (service.ts / *-service.ts)    │  reglas de negocio + transactions
│  "¿Qué hace al cumplirse la operación?" │
├─────────────────────────────────────────┤
│  Repository / DTO                       │  queries complejas + shape de salida
│  "¿Cómo lee/escribe de la BD?"          │
├─────────────────────────────────────────┤
│  Schema (db/schema/)                    │  modelo Drizzle
│  "¿Cómo son las tablas?"                │
└─────────────────────────────────────────┘
```

Los recursos simples (languages, wines) no necesitan todas las capas — tienen solo `route.ts`. Los complejos (auth, restaurants) sí (ver sus respectivos READMEs).

---

## Estructura del `src/`

```
src/
├── index.ts            ← Entry Worker: fetch + scheduled handlers
├── app.ts              ← Composición Hono: middlewares + mount de rutas
├── env.ts              ← Env (bindings + secrets) tipado
├── openapi.ts          ← Spec OpenAPI 3.1 (hardcoded, se mantiene a mano)
│
├── auth/               ← sesiones, hashing, tokens de email, middlewares
├── db/                 ← cliente Drizzle + schema (tablas) + seed script
├── email/              ← provider (Console/Resend) + templates HTML
├── middleware/         ← cache, rate-limit, sentry (HTTP transversales)
├── scheduled/          ← handlers de cron (backup + cleanup, no HTTP)
├── storage/            ← R2 helpers (signed URLs + binding nativo)
├── integrations/       ← rebuild-hook a landings
│
├── restaurants/        ← route + service + repo + stats + dto
├── spaces/             ← route (nested bajo /restaurants/:slug/spaces)
├── dishes/             ← route
├── wines/              ← route
├── languages/          ← route
├── users/              ← route
└── media/              ← route (incluye flow de upload directo a R2)
```

Cada carpeta top-level con conceptos no obvios tiene un `README.md`. Los
recursos simples (spaces/dishes/wines/languages/users/media) documentan sus
endpoints en el docstring top-of-file de `route.ts`.

---

## Flow típico de un request

Tomemos `GET /restaurants` como ejemplo:

1. **Cloudflare** entrega el request al Worker con `(req, env, ctx)`.
2. **`src/index.ts#fetch`** → valida `env` → llama a `app.fetch(req, env, ctx)`.
3. **`src/app.ts`** → middlewares globales:
   - `logger` (log del request)
   - setea `c.set('env', c.env)` para compat con helpers legacy
   - `cors` (dinámico, lee `ALLOWED_ORIGIN` del env)
   - `validateSession` → lee cookie `hs_session`, setea `c.get('user')` + `c.get('session')`
   - `sentryMiddleware` → captura 500+ a Sentry
   - rate limit global (100/min, salvo `/health`, `/auth/*`, etc.)
4. **Match de ruta** → `app.route('/restaurants', createRestaurantsRoutes())`.
5. **`src/restaurants/route.ts`** → middlewares específicos:
   - `requireAuth` (401 si no hay user)
   - `cacheHeaders({ maxAge: 30, swr: 120 })` → ETag + 304 si el cliente ya tiene esa versión
6. **Handler** → delega a `listRestaurantsAggregated` + `aggregatedRowToDto`.
7. **Response** → JSON con la lista.

---

## Cómo añadir un endpoint nuevo

### A un recurso que YA existe (ej. añadir `POST /dishes/clone/:id`)

1. Abrir `src/dishes/route.ts`.
2. Añadir un `app.post('/clone/:id', requireAuth, async (c) => { ... })`.
3. Añadir la entrada en el docstring top-of-file (lista de endpoints).
4. Añadir la entrada en `src/openapi.ts` (si querés que salga en `/docs`).
5. Typecheck: `pnpm check`.

### A un recurso nuevo (ej. `/notifications`)

1. Crear carpeta `src/notifications/` con `route.ts`.
2. Exportar `createNotificationsRoutes()` que devuelva una sub-app Hono.
3. En `src/app.ts`, añadir `app.route('/notifications', createNotificationsRoutes())`.
4. Si tiene tablas propias, crear `src/db/schema/notifications.ts` + re-export en `src/db/schema/index.ts`.
5. Para endpoints complejos, separar en `service.ts` + `dto.ts` (ver `src/restaurants/` como ejemplo).
6. `pnpm check` + `pnpm deploy`.

---

## Cómo añadir una tabla nueva

1. Crear `src/db/schema/<tabla>.ts` con `pgTable` + `relations`.
2. Re-exportar en `src/db/schema/index.ts`.
3. `pnpm db:generate` genera la migración incremental en `migrations/`.
4. Inspeccionarla a mano (Drizzle a veces falla con cambios complejos).
5. `pnpm db:migrate` → aplica a la BD apuntada por `DATABASE_URL`.
6. Si querés exponerla por HTTP, crear `src/<recurso>/route.ts` (ver sección anterior).

---

## Cómo correr y deployar

```bash
# Dev local
pnpm dev            # wrangler dev en :8787

# Deploy a prod
pnpm deploy         # wrangler deploy

# Ver logs runtime
pnpm exec wrangler tail --format pretty

# Inspeccionar BD
pnpm db:inspect     # script read-only
pnpm db:studio      # UI web (Drizzle Studio)
```

Setup inicial completo → [`DEPLOY.md`](./DEPLOY.md).

---

## Convenciones del codebase

### Nombres de archivo
- `kebab-case.ts` (nunca camelCase ni PascalCase)
- Nombres **descriptivos**: `password-hash.ts` (no `password.ts`), `rebuild-hook.ts` (no `rebuild.ts`)

### Docstrings
Cada export público debería tener:
```ts
/**
 * Qué hace en 1 línea.
 *
 * Dónde se usa: `src/path/to/file.ts` (y para qué, si no es evidente).
 */
```

### Imports
- Internos siempre con extensión `.js` (Node ESM / Workers). TypeScript con `moduleResolution: bundler` acepta `.js` apuntando a `.ts`.
- Agrupados: externos primero, internos después.

### i18n
Campos multi-idioma = `jsonb` con shape `{ es?, ca?, en?, ... }`. Si un locale no se rellenó, su key simplemente no aparece. Ver `src/db/schema/i18n.ts`.

### Transactions
Toda operación multi-tabla debe correr en `db.transaction(async (tx) => { ... })`. Si falla una query, rollback automático.

### Errors
Dentro de los services: `throw new HTTPException(status, { message })`. El error handler global en `src/app.ts` los convierte en `{ error: message }` + status.

---

## Qué NO está en el api (y dónde buscarlo)

- **UI del backoffice** → `apps/backoffice/` (Next.js, consume este api)
- **Landings** → `apps/{casabella,guixot,...}/` (Astro, consumen este api o Sanity)
- **Package compartido de types** → `packages/api-client/` (DTOs TypeScript que ambos api y backoffice re-exportan)
- **Sanity Studio** → `apps/studio/` (CMS legacy — se está sustituyendo por este api)

Para la arquitectura global del monorepo, ver el `README.md` de la raíz.
