# @hosteleria/backoffice

CMS propio para editar el contenido de las 6 landings del grupo. **Next.js 15 + Tailwind 4 + shadcn tokens + @hosteleria/api-client**.

## Local

Necesitas `apps/api` corriendo primero (`pnpm --filter @hosteleria/api dev`).

```bash
# apps/backoffice/.env.local ya está creado con:
#   NEXT_PUBLIC_API_URL=http://localhost:8787

pnpm --filter @hosteleria/backoffice dev
# → http://localhost:4400
```

Login con las credenciales del admin del seed (`ADMIN_EMAIL` / `ADMIN_PASSWORD` de `apps/api/.env.local`).

## Deploy Vercel

Se despliega como un proyecto independiente del `apps/api`.

### 1) Crear proyecto Vercel

```bash
cd apps/backoffice
vercel link
# proyecto nuevo: "hosteleria-backoffice"
```

Web: **New Project** → repo → **Root Directory** = `apps/backoffice`.

### 2) Env vars en Vercel

Añade en **Project Settings → Environment Variables** (Production + Preview):

- `NEXT_PUBLIC_API_URL=https://api.hosteleria.cat` (producción)
- `NEXT_PUBLIC_API_URL=https://api-preview.hosteleria.cat` (preview, si existe)

En preview puede apuntar al api de producción con Auth Preview Protection habilitada, para no necesitar 2 APIs.

### 3) Deploy

```bash
vercel               # preview URL: hosteleria-backoffice-xxx.vercel.app
vercel --prod        # production
```

### 4) Dominio

Añade `studio.hosteleria.cat` en **Domains** con CNAME en tu registrar.

### 5) CORS del API

En el proyecto `hosteleria-api` de Vercel, actualiza `ALLOWED_ORIGIN` con el dominio real del backoffice:

```
ALLOWED_ORIGIN=https://studio.hosteleria.cat
```

Y redeploya el api para que tome el cambio (`vercel --prod` desde `apps/api`).

## Estructura

- `/login` — form conectado a `loginAction` server action
- `/dashboard` — KPIs + grid de restaurantes + tareas + estado sistema
- `/restaurants` — tabla
- `/restaurants/[slug]` — hub (ficha + grid espacios + aside idiomas)
- `/restaurants/[slug]/spaces/[spaceId]` — editor de espacio con hero/manifesto/horarios
- `/dishes` — carta con filtros
- `/media` — grid con filtros laterales
- `/settings` — idiomas + usuarios

Todos los datos vienen de `@hosteleria/api` vía `getApi()` en Server Components (RSC). Cookies se forwardean automáticamente para preservar la sesión del usuario.
