# @hosteleria/backoffice

Gestor de contenido de las landings del grupo. Una sola app **Next 15** con su api
dentro (`/api/*`: Hono, Drizzle sobre Neon, Lucia, fotos en Cloudflare R2).

- Cómo está organizado: [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- Despliegue en Vercel: [`DEPLOY.md`](./DEPLOY.md)
- Pruebas de navegador: [`e2e/README.md`](./e2e/README.md)

## En local

```bash
cp .env.example .env.local   # y rellenarlo
pnpm --filter @hosteleria/backoffice dev
# → http://localhost:4400 (el api, en http://localhost:4400/api)
```

No hay nada más que arrancar. **La base de datos de `.env.local` es la de
producción**: las pruebas se hacen sobre el restaurante «pruebas» y se restaura lo
que se toque. Las cuentas están en `CUENTAS.md` (no va al repositorio).

Para verificar algo, siempre sobre el build de producción (en `next dev` el
indicador de Next tapa botones):

```bash
NEXT_DIST_DIR=.next-verify pnpm build
NEXT_DIST_DIR=.next-verify pnpm exec next start -p 4410
# al acabar: rm -rf .next-verify && git checkout next-env.d.ts tsconfig.json
```

## Pantallas

- `/login`, `/set-password`
- `/dashboard`: tareas pendientes y restaurantes
- `/restaurants/[slug]`: ficha por apartados, con sus espacios e idiomas
- `/restaurants/[slug]/spaces/[spaceId]`: portada, fotos, horarios y contacto del espacio
- `/restaurants/[slug]/legal`: páginas legales
- `/dishes`: carta (platos, bebidas y vinos)
- `/media`: fotos
- `/settings`: usuarios e idiomas

Las pantallas leen y escriben por `packages/api-client` contra `/api`, en el mismo
origen: la cookie de sesión viaja sola.

## Scripts

| Comando | Para qué |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Next en el puerto 4400 |
| `pnpm check` | Tipos |
| `pnpm test` | Pruebas unitarias (vitest) |
| `pnpm e2e [nombre]` | Pruebas de navegador |
| `pnpm db:generate` / `pnpm db:migrate` | Migraciones (la segunda escribe en producción) |
| `pnpm db:inspect` | Estado de la base de datos, solo lectura |
| `pnpm db:seed` | Datos iniciales para una base de datos nueva |
| `pnpm import:sanity <slug>` | Volcado desde Sanity; sin `--apply` no escribe |
