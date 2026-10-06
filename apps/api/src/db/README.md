# db/

Capa de persistencia — cliente Drizzle sobre Neon Postgres + schema.

## Archivos

| Archivo | Qué hace |
|---|---|
| `client.ts` | `getDb(databaseUrl)` — singleton del pool Neon + Drizzle. Reusado entre requests dentro del mismo Workers isolate. |
| `seed.ts` | Script `tsx` para poblar la BD inicial: idiomas + admin + 6 restaurantes shell. Correr con `pnpm db:seed`. |
| `schema/index.ts` | Barrel — re-exporta todas las tablas |
| `schema/enums.ts` | Postgres enums (publishState, spaceType, mediaUsage, userRole, weekDay) |
| `schema/i18n.ts` | Helpers `i18nString()` / `i18nText()` que crean columnas `jsonb` con shape `{ es?, ca?, en?, ... }` |
| `schema/auth.ts` | Tablas de sesión: `users`, `sessions`, `user_tokens`, `user_restaurants` |
| `schema/content.ts` | Tablas de negocio: `languages`, `restaurants`, `restaurant_locales`, `spaces`, `space_schedule`, `dish_categories`, `dishes`, `wine_categories`, `wines` |
| `schema/media.ts` | `media_assets` (1 fila = 1 objeto en R2) |
| `schema/rate_limits.ts` | Store del rate limiter (ver `src/middleware/rate-limit.ts`) |

## Convenciones

### i18n fields

Los campos multi-idioma se guardan como `jsonb` con shape `{ es?, ca?, en?, ... }`.
Si un locale no está rellenado, su key simplemente no aparece (no `null`, no `""`).

Para leer en TS: `value.es` / `value.ca` / `value.en`.
Para escribir: `{ es: 'Hola', ca: 'Hola' }`.

Helpers en `./schema/i18n.ts`:
- `i18nHasAny(value)` → `true` si al menos 1 locale tiene contenido
- `i18nLocalesFilled(value)` → `['es', 'ca']`

### IDs

Todas las PKs son `text` + cuid2 (via `createId()` del `@paralleldrive/cuid2`).
No usamos `serial` (expone size + no es portable).

### Cascading

- `restaurants` borrado → cascade a `spaces`, `restaurant_locales`, `user_restaurants`
- `spaces` borrado → cascade a `space_schedule`, `dishes`, `wines`, `dish_categories`, `wine_categories`
- `media_assets` borrado → `dishes.imageAssetId` queda en `NULL` (no cascade)

### Transactions

Todo cambio multi-tabla usa `db.transaction()`:
- Crear restaurant + locales
- Patch restaurant + reemplazo de locales
- Crear space + schedule inicial

## Cómo añadir una tabla

1. Crear nuevo archivo en `schema/<tabla>.ts` con el `pgTable` + `relations`
2. Re-exportarlo en `schema/index.ts`
3. `pnpm db:generate` genera la migración en `migrations/`
4. `pnpm db:migrate` la aplica a la BD apuntada por `DATABASE_URL`

## Cómo añadir una columna

1. Editar el schema correspondiente
2. `pnpm db:generate` → nueva migración incremental
3. Revisarla a mano antes de aplicar — Drizzle a veces falla con cambios complejos
4. `pnpm db:migrate` para aplicar
