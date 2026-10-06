# storage/

Interacción con **Cloudflare R2** (bucket `hostelery`).

## Archivos

| Archivo | Qué hace |
|---|---|
| `r2.ts` | `createUploadUrl()`, `deleteObject()`, `headObject()`, `normalizeFilename()` |

## Dos APIs conviven

### 1. R2 Binding nativo (`env.MEDIA`)
Para operaciones directas desde el Worker: `.get()`, `.put()`, `.delete()`,
`.head()`, `.list()`. Rápido, sin firmar nada, sin round-trip extra.

Usado por:
- `src/scheduled/backup.ts` (put + list + delete de backups diarios)
- `src/storage/r2.ts` → `deleteObject` y `headObject` (`env.MEDIA.delete/head`)

### 2. Signed URLs con aws4fetch
Para que el **browser suba binarios directo a R2** (el Worker nunca toca
el archivo — crucial porque Workers tiene límite estricto de body size y
CPU time).

Usado por:
- `src/storage/r2.ts` → `createUploadUrl` genera presigned PUT URL válida 5min

Flow:
```
browser → POST /media/upload-url {name, mimeType, sizeKb}
         ← { uploadUrl, mediaId, publicUrl }
browser → PUT uploadUrl + binario
         ← 200 OK (de R2 directo)
browser → POST /media/:mediaId/confirm (width, height, alt)
         ← { media: {...} }
```

El Worker en `/confirm` verifica con `headObject(env, key)` que el archivo
exista en R2 antes de marcar el asset como listo en BD (previene filas
"fantasma" si el browser falló a mitad del PUT).

## Convención de keys en R2

```
{restaurantSlug}/{YYYY}/{filename}
```

Ej: `casabella/2026/hero-comedor-01.webp`

Ventajas:
- Prefijo por restaurante → fácil listar/borrar por local
- Año separado → permite archivar temporadas viejas
- Filename lleva un cuid2 para evitar colisiones
