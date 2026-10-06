# auth/

Todo lo relacionado con sesiones de usuario: login, logout, verify, hashing,
password strength, tokens de email (welcome / reset) y middlewares que
protegen rutas.

## Archivos

| Archivo | Qué hace |
|---|---|
| `route.ts` | Endpoints HTTP `/auth/*` (thin handlers) |
| `login-service.ts` | `performLogin(env, input, meta)` — verifica password, crea sesión Lucia, enrichece con IP/UA |
| `password-flow.ts` | `requestPasswordReset(email)` + `applyPasswordChange({token, newPassword, kind})` — flow completo de reset y welcome |
| `password-hash.ts` | `hashPassword()` + `verifyPassword()` — scrypt vía `@noble/hashes` (pure JS, compatible con Workers) |
| `password-strength.ts` | `checkPasswordStrength()` — valida con zxcvbn + rechaza si contiene email/nombre |
| `session-tokens.ts` | `createToken()` + `consumeToken()` — tokens de un solo uso para welcome/reset (SHA-256 en BD) |
| `lucia.ts` | `getLucia(env, opts)` — init del adapter Lucia + Drizzle |
| `middleware.ts` | `validateSession` (lee cookie), `requireAuth`, `requireAdmin`, `requireRestaurant(slug)` |
| `device-hint.ts` | `parseDeviceHint(ua)` — "macOS · Chrome" para la UI de sesiones activas |

## Flow típico — login

1. Browser → `POST /auth/login` con `{ email, password }`
2. `route.ts` llama a `performLogin(env, body, { ip, userAgent })`
3. `performLogin` lee user de BD → `verifyPassword(password, user.passwordHash)` (timing-constant con DUMMY_HASH si no existe) → crea sesión Lucia → guarda ipHash + userAgent
4. `route.ts` setea el header `Set-Cookie: hs_session=...` y responde `{ user }`

## Flow típico — reset de password

1. User → `POST /auth/forgot` con `{ email }` → `requestPasswordReset(env, email)` genera token + envía email (idempotente, siempre 200)
2. User clickea link del email → UI → `POST /auth/reset` con `{ token, newPassword }`
3. `applyPasswordChange({token, newPassword, kind: 'password_reset'})`:
   - Consume token (atómico, si válido devuelve userId)
   - Valida fuerza de newPassword
   - Hashea con `hashPassword` y guarda
   - Invalida TODAS las sesiones activas del user (`password_reset` only)

## Dónde se conecta con el resto

- `middleware.validateSession` se monta en `src/app.ts` como middleware global → setea `c.get('user')` + `c.get('session')` en toda request
- `requireAuth`, `requireAdmin`, `requireRestaurant` → usados por cada `*/route.ts` para proteger endpoints
- Los emails de welcome/reset usan `src/email/{provider,templates}.ts`
