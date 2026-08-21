# Sanity → Vercel dispatcher (Cloudflare Worker)

Un solo webhook de Sanity dispara el rebuild del restaurante correcto en Vercel, gracias a un pequeño Cloudflare Worker que actúa de router.

Ventajas:
- **Sanity Free** permite solo 2 webhooks → con este dispatcher usas **1 solo** para los 5 restaurantes (y te sobra 1).
- Escala automáticamente si añades más restaurantes al monorepo (solo hay que añadir el nuevo `HOOK_*` env var).
- Cada cambio en Sanity redespliega **solo** el restaurante afectado (sin builds innecesarios).
- Coste: **0 €/mes** (Cloudflare Worker Free tier → 100 000 requests/día).

---

## Flujo end-to-end

```
Editor publica un plato de Guixot en Sanity Studio
       │
       ▼
Sanity webhook (único) — POST con payload
       │
       ▼
Cloudflare Worker (este código)
       │  detecta "guixot" desde restaurante._ref o _id
       ▼
Vercel Deploy Hook de Guixot  →  rebuild Guixot en producción
```

---

## 1) Prerrequisito — Deploy Hooks de Vercel

Antes de desplegar el Worker necesitas los Deploy Hook URLs de cada proyecto Vercel. Por cada restaurante ya desplegado:

1. Vercel → tu proyecto → **Settings → Git → Deploy Hooks**
2. **Create Hook**:
   - Name: `Sanity dispatch`
   - Branch: `main`
3. Copia la URL que genera (`https://api.vercel.com/v1/integrations/deploy/prj_xxx/xxx`)
4. Guarda en un sitio seguro con el nombre del restaurante

Al final tendrás algo así:

```
casabella      https://api.vercel.com/v1/integrations/deploy/prj_aaa/aaa
guixot         https://api.vercel.com/v1/integrations/deploy/prj_bbb/bbb
la-principal   https://api.vercel.com/v1/integrations/deploy/prj_ccc/ccc
pubilla        https://api.vercel.com/v1/integrations/deploy/prj_ddd/ddd
roure          https://api.vercel.com/v1/integrations/deploy/prj_eee/eee
```

> Solo necesitas los Deploy Hooks de los restaurantes que ya están desplegados. Los que aún no lo estén, los añades después.

---

## 2) Desplegar el Worker en Cloudflare

Dos formas: **dashboard** (más rápido para arrancar) o **Wrangler CLI** (mejor para versionar). Aquí explicamos la del dashboard.

### 2a) Crear el Worker

1. Entra a **dash.cloudflare.com** → **Workers & Pages** → **Create application** → **Create Worker**
2. Ponle un nombre: `sanity-dispatcher`
3. Deploy (te crea uno de ejemplo "Hello World")
4. En el Worker recién creado: **Edit code**
5. Borra el código de ejemplo y **pega el contenido de `worker.js`** (este directorio)
6. **Save and deploy**
7. Anota la URL del Worker (algo tipo `https://sanity-dispatcher.tu-usuario.workers.dev`)

### 2b) Configurar env vars (secretos)

En el Worker recién creado: **Settings → Variables → Add variable**

Necesitas añadir 1 secret + 5 URLs (una por restaurante):

| Variable | Type | Value |
|---|---|---|
| `SANITY_SECRET` | **Encrypt** | inventa un string aleatorio largo (ej. `openssl rand -hex 24`). Este mismo lo pondrás en el webhook de Sanity |
| `HOOK_CASABELLA` | **Encrypt** | Deploy Hook URL de Casabella (paso 1) |
| `HOOK_GUIXOT` | **Encrypt** | Deploy Hook URL de Guixot |
| `HOOK_LA_PRINCIPAL` | **Encrypt** | Deploy Hook URL de La Principal |
| `HOOK_PUBILLA` | **Encrypt** | Deploy Hook URL de La Pubilla |
| `HOOK_ROURE` | **Encrypt** | Deploy Hook URL de Roure |

Marca todos como **Encrypt** para que no aparezcan en logs ni en la UI después de guardar.

> Los `HOOK_*` que no configures se ignoran silenciosamente (el Worker devuelve `200 OK` con `action: ignored`). Puedes ir añadiéndolos según despliegues cada restaurante.

Después de añadir las vars, redeploy el Worker (**Save and deploy** en el editor).

### 2c) Verificar que el Worker responde

Abre en el navegador: `https://sanity-dispatcher.tu-usuario.workers.dev`

Debes ver:
```json
{ "ok": true, "service": "sanity-dispatcher" }
```

---

## 3) Configurar el webhook único en Sanity

1. **sanity.io/manage** → tu proyecto → **API → Webhooks → Create webhook**
2. Rellena:
   - **Name**: `Dispatcher · rebuild restaurante afectado`
   - **URL**: `https://sanity-dispatcher.tu-usuario.workers.dev?secret=EL_SECRET_QUE_PUSISTE`

     > Sustituye `EL_SECRET_QUE_PUSISTE` por el mismo string de `SANITY_SECRET` del Worker.

   - **Dataset**: `production`
   - **Trigger on**: ✓ Create · ✓ Update · ✓ Delete
   - **Filter (GROQ)**:
     ```
     _type in ["restaurante", "categoriaVino", "vino", "categoriaPlato", "plato", "paginaLegal", "resena"]
     ```
   - **Projection (GROQ)** — importante, así el Worker recibe los campos que necesita:
     ```
     {
       "_id": _id,
       "_type": _type,
       "slug": slug,
       "restaurante": restaurante
     }
     ```
   - **HTTP method**: `POST`
   - **HTTP Headers**: (dejar vacío — usamos secret en query string)
   - **API version**: `v2021-03-25`
3. Save

---

## 4) Test end-to-end

1. En Sanity Studio, edita cualquier campo de un restaurante (por ejemplo `heroSubtitulo` de Guixot)
2. Publish
3. En **Cloudflare Workers dashboard → tu worker → Logs (Real-time / Tail)** verás la request entrante y un JSON de respuesta tipo:
   ```json
   {
     "ok": true,
     "action": "deploy_triggered",
     "restaurant": "guixot",
     "vercel": { "status": 201, ... }
   }
   ```
4. En Vercel → proyecto de Guixot → **Deployments** → verás un deploy nuevo con source **Deploy Hook**
5. Cuando termine (~1-2 min), recarga el sitio productivo → el cambio debe estar visible

Si edito un plato de Casabella (no de Guixot), el Worker debe disparar solo el hook de Casabella. Verifica que otros proyectos NO redespliegan.

---

## 5) Añadir un restaurante nuevo en el futuro

1. Sube el Deploy Hook URL de Vercel del nuevo restaurante
2. Añade `HOOK_NUEVO_RESTAURANTE` en las env vars del Worker
3. Si el slug tiene caracteres especiales (por ejemplo `mi-nuevo-resto`), actualiza el array `KNOWN_SLUGS` en `worker.js` y redespliega
4. Ya está — el mismo webhook de Sanity lo enruta correctamente

---

## Errores comunes

| Síntoma | Causa | Fix |
|---|---|---|
| Sanity webhook logs muestran `401 Unauthorized` | Secret no coincide | Verifica que `?secret=` en la URL del webhook coincide con `SANITY_SECRET` del Worker |
| Worker devuelve `no restaurant detected` | Projection GROQ no incluye `restaurante` o `slug` | Copia la projection tal cual del paso 3 |
| Vercel devuelve 404 al Deploy Hook | Deploy Hook borrado en Vercel | Recrea el Deploy Hook y actualiza el `HOOK_*` correspondiente |
| Deploy dispara pero rebuild falla | Env vars del proyecto Vercel mal | Verifica `SANITY_PROJECT_ID`, `SANITY_DATASET`, `RESTAURANT_SLUG` en Vercel Settings |
| Todos los restaurantes hacen rebuild simultáneo | Filtro GROQ vacío o incorrecto | Aplica el filtro `_type in [...]` del paso 3 |

---

## Alternativa: desplegar con Wrangler CLI

Si prefieres versionar el Worker desde el repo:

```bash
npm install -g wrangler
cd services/sanity-dispatcher
wrangler login
wrangler deploy worker.js --name sanity-dispatcher
# Añadir secrets uno a uno:
wrangler secret put SANITY_SECRET
wrangler secret put HOOK_CASABELLA
# ... etc
```

Con Wrangler puedes hacer `git push` + `wrangler deploy` desde CI/CD.
