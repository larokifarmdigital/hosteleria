# Despliegue del backoffice (Vercel)

El backoffice es una sola app Next que lleva dentro su api (`/api/*`). Se despliega
como **un proyecto de Vercel**. Fuera de Vercel solo quedan la base de datos (Neon)
y las fotos (Cloudflare R2).

`<backoffice>` es el dominio de producción del proyecto: hoy
`hosteleria-two.vercel.app`.

## 1. Proyecto

- **Root Directory**: `apps/backoffice`. Framework: Next.js (lo detecta solo).
- Node 22 o superior.
- La duración máxima de las funciones y el número de crons dependen del plan de
  Vercel: la copia diaria recorre toda la base de datos y tiene que caber.

## 2. Variables de entorno

En **Project Settings → Environment Variables** (Production). La lista que manda
es `src/core/shared/infrastructure/env.ts`; `.env.example` la resume.

| Variable | Obligatoria | Para qué |
|---|---|---|
| `DATABASE_URL` | sí | Neon, con pooler (`-pooler` en el host) |
| `SESSION_SECRET` | sí | 32 bytes en hexadecimal (`openssl rand -hex 32`). Cambiarlo cierra todas las sesiones |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | sí | API S3 de R2 |
| `R2_BUCKET` | sí | `hostelery` |
| `R2_PUBLIC_URL` | sí | Dirección pública del bucket |
| `R2_BACKUP_BUCKET` | para la copia | Bucket **privado** aparte para la copia diaria. Nunca el de las fotos: ese se sirve entero en público. Sin esta variable la copia falla a propósito |
| `CRON_SECRET` | sí | Sin él los crons no se ejecutan (se rechazan todas las llamadas) |
| `APP_URL` | sí | `https://<backoffice>`: con él se montan los enlaces de invitación |
| `RESEND_API_KEY`, `EMAIL_FROM` | no | Correo. Sin clave, las invitaciones van por enlace copiado a mano |
| `COOKIE_DOMAIN` | no | Vacío: la cookie vale para el host que responde |

`APP_ENV` no se define en producción: solo `development` quita `Secure` de la cookie.
`ADMIN_EMAIL` / `ADMIN_PASSWORD` solo los usa `pnpm db:seed`, en local.

## 3. Crons

Declarados en `vercel.json`; Vercel los registra al desplegar y los llama con
`Authorization: Bearer <CRON_SECRET>`.

| Ruta | Hora (UTC) | Qué hace |
|---|---|---|
| `/api/cron/backup` | 03:00 | Copia de la base de datos al bucket privado `R2_BACKUP_BUCKET` (`backups/`), 30 días. Sin contraseñas ni deploy hooks |
| `/api/cron/cleanup` | 04:00 | Sesiones caducadas, límites de peticiones viejos y subidas de fotos sin confirmar |

Para lanzar uno a mano:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<backoffice>/api/cron/cleanup
```

## 4. CORS del bucket de fotos

El navegador sube las fotos directo a R2 con una URL firmada, así que el bucket
tiene que aceptar `PUT` desde el origen del backoffice. Las reglas están en
`r2-cors.json`: añade `https://<backoffice>` a `AllowedOrigins` y pégalas en el
panel de Cloudflare (**R2 → hostelery → Settings → CORS Policy**).

Sin esto la subida falla en el navegador antes de salir (error de CORS). En local
solo está permitido `http://localhost:4400`.

## 5. Migraciones

Van contra producción: no hay otra base de datos.

```bash
cd apps/backoffice
pnpm db:generate   # crea la migración en migrations/ a partir del schema (no toca la base de datos)
pnpm db:migrate    # la aplica a la base de datos de DATABASE_URL (.env.local)
```

Revisar el SQL generado antes de aplicarlo. Se aplica **antes** de desplegar el
código que lo necesita. `pnpm db:push` no se usa: salta las migraciones.

## 6. Comprobar un despliegue

```bash
curl https://<backoffice>/api/health
# {"ok":true,"db":"connected",...}

curl -i https://<backoffice>/api/public/restaurants/pubilla
# 200, con ETag y `cache-control: public, max-age=0, must-revalidate`
```

Después, entrar en `https://<backoffice>/login`, abrir un restaurante y subir una
foto en «pruebas» (comprueba el CORS del bucket).

## 7. Landings

Cada landing lee el contenido en el build, de `CONTENT_API_URL`. Con el api dentro
del backoffice el valor es `https://<backoffice>/api` (con `/api`, sin barra final)
en los seis proyectos de Vercel: pubilla, la-principal, roure, casabella, guixot y
ocana. Tras cambiarlo, un redeploy de cada una y comprobar su `/build.json` y la
tarjeta «Web» de su ficha.

## 8. Volver atrás

En Vercel, **Deployments → (el anterior) → Promote to Production** (o Instant
Rollback). Las migraciones no se deshacen solas: si el despliegue traía una, el
código anterior tiene que seguir funcionando con el schema nuevo.

## 9. Base de datos nueva (no es el caso habitual)

```bash
pnpm db:migrate
pnpm db:seed      # idiomas, administrador (ADMIN_EMAIL / ADMIN_PASSWORD) y restaurantes vacíos
pnpm db:inspect   # solo lectura: tablas, recuento y restaurantes
```

`db:seed` no toca lo que ya existe.

## Problemas conocidos

| Síntoma | Causa | Arreglo |
|---|---|---|
| «Entorno inválido» en los logs | Falta una variable o está mal | Revisarla en Vercel y volver a desplegar |
| `/api/health` responde `db: error` | `DATABASE_URL` | Copiarla otra vez desde Neon (con pooler) |
| La subida de fotos falla con error de CORS | El origen no está en el bucket | Punto 4 |
| El cron responde 401 | `CRON_SECRET` sin definir o distinto | Punto 2 |
| Las fotos no cargan pero el resto sí | R2 (`*.r2.dev`) no responde | No depende de Vercel: esperar o probar desde otra red |
