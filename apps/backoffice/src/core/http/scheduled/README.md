# scheduled/

Tareas diarias. Las dispara **Vercel Cron** con un GET a `src/app/api/cron/<tarea>/route.ts`,
que comprueba `Authorization: Bearer <CRON_SECRET>` (`../cronAuth.ts`) y llama a la función.

| Archivo | Horario (`vercel.json`) | Qué hace |
|---|---|---|
| `backup.ts` | `0 3 * * *` (03:00 UTC) | Vuelca la BD en JSON a R2, en `backups/YYYY-MM-DD.json`. Conserva 30 días. Sin `passwordHash`. |
| `cleanup.ts` | `0 4 * * *` (04:00 UTC) | Borra sesiones caducadas, filas viejas de `rate_limits` (más de 7 días) y subidas sin confirmar. |

En el plan Hobby de Vercel un cron diario se lanza en algún momento de la hora indicada, no en el minuto exacto.

## Probar en local

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:4400/api/cron/cleanup
```

Las dos van contra la base de datos y el bucket de producción.

## Añadir una tarea

1. `mi-tarea.ts` aquí, con `export async function runMiTarea()`.
2. `src/app/api/cron/mi-tarea/route.ts`, copiando una de las existentes.
3. Su horario en `vercel.json`.
