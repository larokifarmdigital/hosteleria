# integrations/

Comunicación con servicios **externos**, fire-and-forget.

## Archivos

| Archivo | Qué hace |
|---|---|
| `rebuild-hook.ts` | `fireRebuildHook(url, meta?)` — dispara el deploy hook de la landing de un restaurante tras publicar cambios |

## Flow

Cada restaurante tiene un `rebuildHookUrl` opcional (columna de la tabla
`restaurants`). Es la URL de un deploy webhook de Vercel / Cloudflare Pages
/ Netlify / cualquier plataforma que acepte POST para disparar un rebuild.

Cuando `PATCH /restaurants/:slug` detecta que corresponde rebuildear
(acaba de publicarse, o estaba publicado y se editó un campo), llama a
`fireRebuildHook(hookUrl)` **sin bloquear la response**:

```ts
void fireRebuildHook(r.rebuildHookUrl, { restaurantSlug: r.slug });
```

Timeout de 3 segundos. Si el hook no responde a tiempo, abandona y
loguea. El rebuild sigue corriendo del lado del provider.

## Qué va acá y qué NO

- ✅ Clients de APIs 3rd-party que llamamos de forma puntual (webhooks, apis externas)
- ❌ Email → tiene su propia carpeta `src/email/`
- ❌ Storage R2 → tiene su propia carpeta `src/storage/`
- ❌ Sentry → es un middleware transversal, va en `src/middleware/`
