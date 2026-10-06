# scheduled/

Tareas que corren por **Cloudflare Cron Triggers**, no por HTTP.

El handler `scheduled` del Worker (en `src/index.ts`) recibe los events del
cron y despacha a estas funciones según el schedule que disparó.

## Archivos

| Archivo | Schedule | Qué hace |
|---|---|---|
| `backup.ts` | `0 3 * * *` (03:00 UTC diario) | Dump JSON de toda la BD a R2 bajo `backups/YYYY-MM-DD.json`. Retención 30 días. No incluye `passwordHash` (seguridad del backup si se filtra). |
| `cleanup.ts` | `0 4 * * *` (04:00 UTC diario) | Borra sesiones Lucia caducadas + filas viejas de `rate_limits` (>7 días). |

## Cómo se disparan

Los schedules están declarados en `apps/api/wrangler.toml#triggers.crons`.
Cloudflare invoca el handler `scheduled` del Worker con `event.cron =
"0 3 * * *"` o `"0 4 * * *"` según cuál disparó.

`src/index.ts` branche a `runBackup(env)` o `runCleanup(env)` según.

## Diferencia con endpoints HTTP de cron

En Vercel teníamos `/cron/cleanup` y `/cron/backup` HTTP protegidos con
`Authorization: Bearer CRON_SECRET`. En Workers no hace falta — las tareas
las invoca el runtime, no se exponen como endpoints.

## Añadir una tarea nueva

1. Crear `src/scheduled/mi-tarea.ts` con una función `export async function
   runMiTarea(env: Env)`.
2. Añadir el schedule a `wrangler.toml#triggers.crons`.
3. Añadir un `else if (event.cron === "...")` en `src/index.ts#scheduled`.
4. `pnpm deploy` → Cloudflare registra el cron automáticamente.
