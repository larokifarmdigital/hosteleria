# restaurants/

El módulo más completo del api. Un restaurant es la "ficha" del local
(nombre, dominio, dirección, SEO, i18n, etc.) y agrupa:
- 1..N spaces (salas: `src/spaces/`)
- platos y vinos vía los spaces (`src/dishes/`, `src/wines/`)
- media (`src/media/`)
- editores vía m2m (`user_restaurants`)

## Archivos

| Archivo | Qué hace |
|---|---|
| `route.ts` | 6 endpoints HTTP + Zod schemas (thin handlers) |
| `service.ts` | Lógica de negocio: `createRestaurantWithLocales`, `patchRestaurant`, `discardChanges`, `deleteRestaurant` |
| `dto.ts` | Construye el DTO final: `toDto(env, id)` + `aggregatedRowToDto(row)` |
| `repository.ts` | `listRestaurantsAggregated(env, { allowedIds })` — 1 sola SQL optimizada con JOINs + array_agg (evita N+1) |
| `stats.ts` | Campos derivados: `completePercent`, `countByRestaurant`, `getActiveLocaleCodes` |

## Flow típico — GET /restaurants

1. `route.ts` chequea rol (editors solo ven asignados → carga `allowedIds` de `user_restaurants`)
2. Llama `listRestaurantsAggregated(env, { allowedIds })` → **1 query** con locales + counts
3. Mapea cada row con `aggregatedRowToDto(row)` → shape igual al tipo `Restaurant` del backoffice
4. Responde `{ restaurants: [...] }`

## Flow típico — PATCH /restaurants/:slug + publish

1. `route.ts` valida con `patchSchema` (Zod)
2. `patchRestaurant(env, slug, body, actorId)`:
   - Si pasa a `state=published`, guarda `publishedSnapshot` con los campos editables (para que `/discard` pueda volver atrás)
   - Si viene `activeLocaleCodes`, borra todos los `restaurantLocales` y re-inserta — todo en 1 **transaction**
   - Devuelve `{ shouldRebuild, rebuildHookUrl, slug, id }`
3. `route.ts` dispara `fireRebuildHook` (fire-and-forget) si corresponde
4. Carga DTO fresco con `toDto(env, id)` y responde

## Flow típico — POST /restaurants/:slug/discard

Restaura los campos editables al `publishedSnapshot` guardado la última
vez que se publicó. No toca locales ni spaces. State vuelve a `published`.

## Campos derivados (no persistidos)

Se calculan on-the-fly en `stats.ts` cada vez que se construye un DTO:
- `completePercent` — % de campos "clave" rellenos
- `spacesCount`, `dishesCount`, `winesCount` — conteos
- `activeLocales` — codes ISO de locales activos

Para el listado del dashboard, estos campos los calcula directamente la SQL
en `repository.ts` (más rápido que iterar en Node).
