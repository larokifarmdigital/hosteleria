# apps/api — retirado en la rama `migracion-api-vercel`

El api ya no es un proyecto aparte: vive dentro del backoffice
(`apps/backoffice/src/core`) y se sirve en su mismo origen, bajo `/api`.
Ver `apps/backoffice/ARCHITECTURE.md` y `apps/backoffice/DEPLOY.md`.

## Por qué sigue aquí esta carpeta

El Worker `hostelery-api` de Cloudflare sigue en producción y las seis landings
todavía leen de él. Se despliega desde la rama `main`, donde esta carpeta está
entera. Aquí solo queda `wrangler.toml`, como referencia de cómo está
configurado ese Worker (crons, bucket, variables) mientras conviven los dos.

La carpeta se borra cuando las landings lean del backoffice y Erick dé por
retirado el Worker (fase F6 de `.claude/plan-migracion-api-vercel.md`).

Desde esta rama no se puede desplegar ni arrancar el Worker: no hay código ni
`package.json`.
