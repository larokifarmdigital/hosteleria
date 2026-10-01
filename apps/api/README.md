# @hosteleria/api

Backend HTTP para el backoffice del grupo. **Hono + Drizzle + Neon + Lucia + R2**.

## Local

```bash
# 1) Rellena apps/api/.env.local con:
#    DATABASE_URL, SESSION_SECRET, R2_*, ADMIN_EMAIL, ADMIN_PASSWORD, ALLOWED_ORIGIN

# 2) Migra el schema a Neon
pnpm --filter @hosteleria/api db:migrate

# 3) Seed idiomas + admin + 6 restaurantes shell
pnpm --filter @hosteleria/api db:seed

# 4) Arranca
pnpm --filter @hosteleria/api dev
# → http://localhost:8787
```

Health check:
```bash
curl http://localhost:8787/health
# → {"ok":true,"db":"connected",...}
```

## Deploy Vercel

Es una app separada del backoffice — deploy independiente, mismo dashboard.

### 1) Crear proyecto Vercel

```bash
cd apps/api
vercel link
# selecciona la cuenta y crea un proyecto nuevo llamado "hosteleria-api"
```

O desde la web: **New Project** → importa el repo → **Root Directory** = `apps/api` → **Framework Preset** = `Other`.

### 2) Env vars en Vercel

Añade todas las variables de `.env.example` en **Project Settings → Environment Variables**, tanto en Production como Preview:

- `DATABASE_URL` — connection string Neon (branch `production` para prod)
- `SESSION_SECRET` — random 32 chars hex
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`
- `ALLOWED_ORIGIN=https://studio.hosteleria.cat` (o el dominio que uses)

### 3) Deploy

```bash
vercel                # preview
vercel --prod         # production
```

### 4) Dominio custom

En **Project Settings → Domains** añade `api.hosteleria.cat` y sigue las instrucciones de DNS (añadir CNAME en el registrar).

### 5) Cookie cross-subdomain (importante)

Al deployar en prod, Lucia setea la cookie con `Domain=.hosteleria.cat` (ver `apps/api/src/auth/lucia.ts`). Así se comparte entre `studio.hosteleria.cat` (backoffice) y `api.hosteleria.cat`. Asegúrate que ambos deploys estén bajo el mismo apex.

## Rutas

- `GET /health`
- `POST /auth/login` · `POST /auth/logout` · `GET /auth/session`
- `GET/POST/PATCH/DELETE /restaurants` · `/restaurants/:slug`
- `GET/POST/PATCH/DELETE /restaurants/:slug/spaces` · `/:spaceId`
- `GET/POST/PATCH/DELETE /dishes` · `/dishes/categories`
- `GET/POST/PATCH/DELETE /wines` · `/wines/categories`
- `GET/POST/PATCH/DELETE /languages`
- `GET/POST/PATCH/DELETE /users` (admin only)
- `POST /media/upload-url` · `POST /media/:id/confirm` · `GET/PATCH/DELETE /media`
