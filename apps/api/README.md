# @hosteleria/api

Backend HTTP del backoffice del grupo. Corre sobre **Cloudflare Workers**.

**Stack**: Hono · Drizzle · Neon Postgres · Lucia (sessions) · Cloudflare R2 (media).

---

## Correr en local

```bash
# 1) Rellená apps/api/.env.local con los valores reales
#    (ver .env.example como plantilla)
cp .env.example .env.local

# 2) Migrá el schema a Neon (una sola vez por branch)
pnpm --filter @hosteleria/api db:migrate

# 3) Seed inicial: idiomas + admin + 6 restaurantes shell
pnpm --filter @hosteleria/api db:seed

# 4) Arrancá el Worker en dev
pnpm --filter @hosteleria/api dev
# → http://localhost:8787
```

**Health check:**
```bash
curl http://localhost:8787/health
# → {"ok":true,"db":"connected",...}
```

---

## Deploy a producción

**Ver [DEPLOY.md](./DEPLOY.md)** — paso a paso completo para desplegar a
Cloudflare Workers (login, secrets, deploy, verificación).

Resumen de 1 línea:
```bash
pnpm --filter @hosteleria/api run deploy
```

---

## Estructura

```
src/
├── index.ts               # Entry Worker (fetch + scheduled handlers)
├── app.ts                 # Hono app, montaje de rutas y middlewares
├── env.ts                 # Tipos Env (bindings + secrets)
├── openapi.ts             # OpenAPI spec servido en /openapi.json
├── auth/                  # Lucia, middleware de sesión, hashing argon2
├── routes/                # Un archivo por recurso
├── lib/                   # Helpers transversales (ver src/lib/README)
├── db/
│   ├── client.ts
│   ├── schema/            # Tablas Drizzle (auth, content, media, …)
│   └── seed.ts            # Script de seed inicial (tsx)
└── scripts/
    └── db-inspect.ts      # Diagnóstico read-only de la BD
```

---

## Rutas públicas

- `GET /` — info del api
- `GET /health` — health check
- `GET /openapi.json` — spec
- `GET /docs` — UI de Scalar (interactiva)

## Rutas de negocio

- `POST /auth/login` · `POST /auth/logout` · `GET /auth/session`
- `POST /auth/forgot` · `POST /auth/reset` · `POST /auth/set-password`
- `GET /auth/sessions` · `DELETE /auth/sessions/:id` · `DELETE /auth/sessions`
- `GET/POST/PATCH/DELETE /restaurants` · `/:slug` · `/:slug/publish` · `/:slug/discard`
- `GET/POST/PATCH/DELETE /restaurants/:slug/spaces` · `/:spaceId`
- `GET/POST/PATCH/DELETE /dishes` · `/dishes/categories`
- `GET/POST/PATCH/DELETE /wines` · `/wines/categories`
- `GET/POST/PATCH/DELETE /languages`
- `GET/POST/PATCH/DELETE /users` (admin only)
- `POST /media/upload-url` · `POST /media/:id/confirm` · `GET/PATCH/DELETE /media`

## Scheduled (cron)

- **03:00 UTC** → backup diario de la BD a R2 (retención 30 días)
- **04:00 UTC** → cleanup de sesiones y rate_limits expirados

Ver `src/index.ts#scheduled` y `wrangler.toml#triggers`.

---

## Comandos útiles

| Comando | Para qué |
|---|---|
| `pnpm dev` | Levanta el Worker local (`wrangler dev`) en :8787 |
| `pnpm deploy` | Deploy a prod |
| `pnpm check` | Typecheck |
| `pnpm db:migrate` | Aplica migraciones Drizzle a Neon |
| `pnpm db:seed` | Seed inicial (idiomas + admin + 6 restaurantes) |
| `pnpm db:inspect` | Diagnóstico read-only del estado de la BD |
| `pnpm db:studio` | Abre Drizzle Studio (UI web para la BD) |
| `pnpm test` | Corre vitest |
