# Arquitectura del backoffice

Una sola app Next 15 que lleva dentro su backend. Se despliega en Vercel
([`DEPLOY.md`](./DEPLOY.md)).

```
Navegador ── pantallas (src/app, components, lib)
    │  fetch a /api/* (mismo origen, cookie hs_session)
    ▼
src/app/api/[[...path]]/route.ts ── app Hono (src/core/http)
    │                                   │
    │  casos de uso (src/core/<dominio>/application)
    ▼                                   ▼
Neon Postgres (Drizzle)        Cloudflare R2 (API S3)

Landings (Astro, en el build) ── GET /api/public/restaurants/:slug
Vercel Cron ── GET /api/cron/{backup,cleanup}
```

- **Hono** montado dentro de Next: el contrato HTTP es el mismo que tenía el api
  cuando era un Worker. Las rutas se declaran sin prefijo (`/restaurants`); Next las
  cuelga de `/api`.
- **Drizzle** sobre **Neon**. **Lucia** para las sesiones (cookie `hs_session`).
- **R2** por su API S3: el navegador sube las fotos directo con una URL firmada.
- El frontend habla con el backend por HTTP (`packages/api-client` + TanStack
  Query), no por server actions.

## Carpetas

```
apps/backoffice/
├── src/
│   ├── app/                 rutas de Next: pantallas y `api/`
│   │   └── api/
│   │       ├── [[...path]]/ la app Hono
│   │       └── cron/        backup y cleanup (Vercel Cron)
│   ├── components/, lib/    frontend
│   └── core/                backend
│       ├── <dominio>/       auth, users, restaurants, spaces, menu, media,
│       │   ├── domain/        languages, legal, site, shared
│       │   ├── application/
│       │   └── infrastructure/
│       └── http/            app Hono: rutas, middleware, DTO, tareas programadas
├── migrations/              SQL generado por drizzle-kit
├── scripts/                 seed, db-inspect
├── tests/                   vitest
└── e2e/                     pruebas de navegador (Playwright)
```

Cada dominio se importa por su barrel (`@/core/restaurants`), nunca por una ruta
interna de otro dominio.

| Capa | Qué contiene | Depende de |
|---|---|---|
| `domain` | modelos, reglas y contratos (`repositories`, `services`) | nada |
| `application` | casos de uso: una operación de negocio cada uno | `domain` |
| `infrastructure` | Drizzle, R2, correo, sondeo de la web | `domain` |
| `http` | valida la petición (zod), llama al caso de uso y da forma a la respuesta | todo lo anterior |

`http/compositionRoot.ts` es el único sitio donde se juntan casos de uso e
infraestructura. El entorno se lee y valida en `shared/infrastructure/env.ts`.

## Una petición

`GET /api/restaurants`:

1. Next la entrega a `src/app/api/[[...path]]/route.ts`, que se la pasa a la app Hono.
2. Middleware (`http/app.ts`): contenedor de casos de uso, sesión (salvo en
   `/public`), límite de 100 peticiones por minuto y usuario.
3. `http/routes/restaurantsRoutes.ts`: exige sesión, llama al caso de uso y
   convierte el resultado en DTO.

Lo que tiene que pasar después de responder (pedir el rebuild de una landing) se
aplaza con `after()` de Next.

## Lectura pública

`/api/public/*` no mira la sesión ni pone cookies: su respuesta es la misma para
todos y lleva `ETag`. Solo sale lo publicado
(`core/site/domain/models/publishedSite.ts`). Las landings la leen en el
build con `packages/content-client` y publican el `ETag` en su `/build.json`; el
backoffice lo compara para saber si la web ya enseña lo último.

## Añadir cosas

**Un endpoint** en un recurso que ya existe: caso de uso en
`core/<dominio>/application`, registrarlo en `http/compositionRoot.ts`, ruta en
`http/routes/<recurso>Routes.ts` y, si lo llama el frontend, su tipo y su método
en `packages/api-client`.

**Una tabla**: schema en `core/shared/infrastructure/drizzle/schema/`, exportarla
en su `index.ts`, `pnpm db:generate`, revisar el SQL y `pnpm db:migrate` (va contra
producción).

**Un campo de contenido** de la ficha o del espacio: ver «Campos de contenido» en
`.claude/CLAUDE.md`; hay que tocar varios sitios y están listados ahí.

**Una tarea programada**: función en `http/scheduled/`, ruta en
`src/app/api/cron/<nombre>/route.ts` y horario en `vercel.json`.

## Convenciones

- Campos en varios idiomas: `jsonb` con forma `{ es?, ca?, en? }`. Un idioma sin
  rellenar no tiene clave.
- Una operación que toca varias tablas va en `db.transaction`.
- Los errores de negocio se lanzan como errores de dominio; `http/httpErrors.ts`
  los convierte en la respuesta.
- drizzle `sql`: un array JS interpolado se expande a `($1, $2)`; usar
  `IN (${sql.join(...)})`.

## Comandos

```bash
pnpm dev            # next dev en :4400
pnpm check          # tipos
pnpm test           # vitest
pnpm e2e            # lista las pruebas de navegador (ver e2e/README.md)
pnpm db:generate    # migración nueva a partir del schema
pnpm db:migrate     # aplicar migraciones (producción)
pnpm db:inspect     # solo lectura: tablas y recuentos
pnpm db:studio      # Drizzle Studio
```
