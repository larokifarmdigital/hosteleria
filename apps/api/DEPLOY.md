# Deploy del api — Cloudflare Workers

Guía paso a paso para desplegar `@hosteleria/api` a Cloudflare Workers desde cero.
Si ya pasaste por acá antes, saltate directo a [Deploys siguientes](#deploys-siguientes).

---

## Prerequisitos

- Cuenta de **Cloudflare** (free tier alcanza)
- Bucket **R2** llamado `hostelery` (ya existe en la cuenta)
- Credenciales R2 (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`)
- Base de datos **Neon** con el schema migrado y seed inicial
- Node.js ≥ 20 y pnpm 10

Si falta algo de la BD, correr primero:
```bash
pnpm --filter @hosteleria/api db:migrate
pnpm --filter @hosteleria/api db:seed
```

---

## Paso 1 — Login a Cloudflare

```bash
cd apps/api
pnpm exec wrangler login
```

Te abre el browser → autorizás con tu cuenta → vuelve a terminal con `Successfully logged in`.

Si ya habías logueado wrangler antes en esta máquina, saltate este paso.

---

## Paso 2 — Setear los secrets

Los secrets NO van en `wrangler.toml` (que se commitea). Se setean uno por uno con `wrangler secret put NOMBRE`. Cada comando te pide pegar el valor (queda oculto en la terminal).

### Secrets obligatorios

```bash
pnpm exec wrangler secret put DATABASE_URL
#  → connection string Neon (postgresql://...)

pnpm exec wrangler secret put SESSION_SECRET
#  → openssl rand -hex 32

pnpm exec wrangler secret put R2_ACCOUNT_ID
#  → 32 chars hex del dashboard R2

pnpm exec wrangler secret put R2_ACCESS_KEY_ID
#  → access key del API token R2

pnpm exec wrangler secret put R2_SECRET_ACCESS_KEY
#  → secret del API token R2
```

### Secrets para el seed inicial (solo si vas a correr `db:seed` desde el Worker)

Normalmente estos los seteás solo si vas a usar un endpoint tipo "re-seed" o si prefieres que el seed los lea del Worker. Si corres `db:seed` con tsx local, usa `.env.local` en vez de secrets.

```bash
pnpm exec wrangler secret put ADMIN_EMAIL        # admin@hostelery.com
pnpm exec wrangler secret put ADMIN_PASSWORD     # la contraseña inicial
```

### Secrets opcionales

```bash
# Si vas a mandar emails de verdad (Resend)
pnpm exec wrangler secret put RESEND_API_KEY

# Si vas a enviar errores a Sentry
pnpm exec wrangler secret put SENTRY_DSN

# Si tenés backoffice bajo el mismo apex que el api
# (ej. api.hosteleria.cat + studio.hosteleria.cat → ".hosteleria.cat")
pnpm exec wrangler secret put COOKIE_DOMAIN
```

### Verificar que están todos

```bash
pnpm exec wrangler secret list
```

Deberías ver los nombres listados (los valores quedan ocultos — es por diseño).

---

## Paso 3 — Deploy

```bash
pnpm --filter @hosteleria/api run deploy
# Internamente: wrangler deploy
```

Output esperado (~30s):
```
Total Upload: 1234.56 KiB / gzip: 345.67 KiB
Uploaded hostelery-api (2.1 sec)
Deployed hostelery-api triggers (0.3 sec)
  https://hostelery-api.<tu-subdomain>.workers.dev
Current Version ID: xxxxx-xxxxx-xxxxx
```

**Guardate la URL** — es el endpoint productivo del api.

---

## Paso 4 — Verificar que funciona

Reemplazá `<URL>` por la que te dio el deploy:

### 4.1 Health check

```bash
curl <URL>/health
```

Esperado:
```json
{"ok":true,"db":"connected","dbError":null,"latencyMs":XX,"version":"0.0.1"}
```

Si da `db:error` → algún secret está mal. Volver al Paso 2 y revisar `DATABASE_URL`.

### 4.2 Login

```bash
curl -i -X POST <URL>/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hostelery.com","password":"TU_PASSWORD"}'
```

Esperado:
```
HTTP/2 200
set-cookie: hs_session=xxxx; HttpOnly; Secure; SameSite=None; ...
{"user":{"id":"...","email":"admin@hostelery.com","role":"admin",...}}
```

### 4.3 Docs interactivas

Abrí en el browser:
```
<URL>/docs
```

Debería renderizar Scalar con todos los endpoints agrupados por tag.

---

## Paso 5 — Verificar triggers y bindings

### 5.1 Crons

En Cloudflare dashboard → **Workers & Pages → hostelery-api → Triggers**.
Deberían aparecer 2 cron jobs:
- `0 3 * * *` → backup diario a R2
- `0 4 * * *` → cleanup de sesiones/rate_limits

### 5.2 R2 binding

En **Settings → Bindings** del Worker debe aparecer:
- `MEDIA` → bucket `hostelery`

Si falta, revisá `wrangler.toml#r2_buckets` y re-deployá.

---

## Paso 6 — Actualizar el backoffice

El backoffice tiene que apuntar al nuevo api.

En `apps/backoffice/.env.local`:
```
NEXT_PUBLIC_API_URL=https://hostelery-api.<tu-subdomain>.workers.dev
```

**Ojo**: sin `/api` al final — en Workers las rutas están en root (no hay basePath).

---

## Paso 7 (opcional) — Dominio custom

Cuando quieras usar `api.hosteleria.cat` en vez de `.workers.dev`:

1. Cloudflare dashboard → **Workers & Pages → hostelery-api → Settings → Triggers → Custom Domains → Add Custom Domain**
2. Pegá `api.hosteleria.cat`
3. Cloudflare auto-detecta si el dominio ya está en tu cuenta y añade los records DNS automáticos. Si no, te da las instrucciones.
4. Esperás ~1 minuto hasta que diga "Active" + SSL emitido.
5. Setear el secret `COOKIE_DOMAIN=.hosteleria.cat` para que la cookie se comparta con `studio.hosteleria.cat` cuando lo deployes.
6. Actualizar `wrangler.toml#vars.ALLOWED_ORIGIN=https://studio.hosteleria.cat` (y re-deployar).

---

## Deploys siguientes

Una vez pasado todo esto, los deploys siguientes son 1 comando:

```bash
pnpm --filter @hosteleria/api run deploy
```

Para ver logs runtime:
```bash
pnpm exec wrangler tail
```

Para actualizar un secret:
```bash
pnpm exec wrangler secret put NOMBRE
```

Para listar deploys y rollback:
```bash
pnpm exec wrangler deployments list
pnpm exec wrangler rollback [version-id]
```

---

## Troubleshooting

| Error | Causa | Fix |
|---|---|---|
| `wrangler login` no vuelve | Firewall / popup bloqueado | `wrangler login --browser=false` (copias URL manual) |
| Deploy error "bucket not found" | R2 bucket `hostelery` no existe o nombre distinto | Verificar en dashboard R2 → crear si falta |
| `/health` responde `db:error` | `DATABASE_URL` mal copiada | `wrangler secret put DATABASE_URL` otra vez |
| `/auth/login` da 500 "wasm" | Fallo compilación de hash-wasm | `wrangler.toml` ya tiene `nodejs_compat`. Si falla, abrir issue |
| CORS error desde browser | `ALLOWED_ORIGIN` no coincide | Editar `wrangler.toml#vars.ALLOWED_ORIGIN` y re-deployar |
| 429 inesperado | Rate limit global (100/min) | Normal bajo load alto; o key colisionó. Ver tabla `rate_limits` |
| Cron no se ejecuta | Zonas horarias / plan limita | Workers crons son UTC. Free plan tiene 1 cron, Paid más |

---

## Cómo rollback-ear si un deploy rompe prod

```bash
# 1. Ver deployments recientes
pnpm exec wrangler deployments list

# 2. Rollback al anterior (reemplaza <version-id>)
pnpm exec wrangler rollback <version-id>
```

El rollback es instantáneo (segundos). Workers no re-buildea — solo cambia qué version está sirviendo.
