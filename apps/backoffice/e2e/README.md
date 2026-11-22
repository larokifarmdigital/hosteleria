# Pruebas de navegador del backoffice

Scripts de Playwright que recorren el backoffice como lo haría una persona y, además,
pasan una auditoría de accesibilidad (axe) a cada pantalla y diálogo que tocan.

## Antes de empezar: contra qué corren

- **No hay base de datos de pruebas**: corren contra la de producción, sobre el restaurante
  **`pruebas`**, y cada prueba restaura lo que cambia. Si una se corta a medias, puede dejar
  restos: `pnpm e2e reset` quita las fotos, y lo demás se ve en el propio backoffice.
- `users-languages` crea y borra un usuario y un idioma de prueba (`zz`).
- `images` y `menu-order-photos` suben fotos reales a R2 y las borran.

## Cómo se ejecutan

1. Api en local (lee los secretos de `apps/api/.env.local`):

   ```bash
   cd apps/api && pnpm exec wrangler dev --port 8788
   ```

2. Backoffice, **build de producción** contra ese api (en `next dev` el indicador de Next
   tapa botones y falsea la auditoría). Con `NEXT_DIST_DIR` no se pisa el `.next` de `next dev`:

   ```bash
   cd apps/backoffice
   NEXT_DIST_DIR=.next-verify NEXT_PUBLIC_API_URL=http://localhost:8788 pnpm build
   NEXT_DIST_DIR=.next-verify pnpm exec next start -p 4400
   ```

   Al acabar: `rm -rf .next-verify && git checkout next-env.d.ts tsconfig.json` (Next los reescribe).
   Las subidas a R2 solo funcionan desde el puerto 4400 (CORS del bucket).
   Si el 4400 está ocupado (por `next dev`), usa otro: arranca el api con
   `--var "ALLOWED_ORIGIN:http://localhost:4400,http://localhost:4410"`, el backoffice con `-p 4410`
   y las pruebas con `BASE=http://localhost:4410 pnpm e2e <nombre>`.

3. Sesiones (una vez; se guardan en `e2e/.work/` y se reutilizan). El login admite
   5 intentos por hora y email. Las cuentas están en `CUENTAS.md`:

   ```bash
   pnpm e2e login <email-admin> <contraseña> admin
   pnpm e2e login <email-editor> <contraseña> editor   # el editor de «pruebas»
   ```

4. Fotos de prueba (una vez; no van al repositorio porque algunas pesan más de 10 MB):

   ```bash
   pnpm e2e fixtures
   ```

5. Ejecutar:

   ```bash
   pnpm e2e                 # lista las pruebas
   pnpm e2e drinks
   ```

   Cada prueba acaba con `N correctas, M fallidas` y sale con error si falla algo.

## Qué cubre cada una

| Prueba | Qué comprueba |
|---|---|
| `public-read` | Lectura pública: solo sale lo publicado, caché, sin cookies. Solo api. |
| `rebuild-hook` | Cuándo se pide regenerar la web (publicar, carta, páginas legales) y cuándo no. Solo api. |
| `rebuild-hook-down` | Un aviso que la web no acepta queda apuntado como fallo. Solo api. |
| `site-status` | Tarjeta «Web» de la ficha y aviso de la carta, en todos sus estados. |
| `pending-tasks` | Bloque «Pendiente» del panel de inicio y de la ficha; los enlaces llevan a su sitio. |
| `drinks` | Pestaña de bebidas de la carta. |
| `menu-order-photos` | Reordenar platos, vinos y categorías; marcar varias fotos a la vez. |
| `images` | Subir, describir, asignar y borrar fotos (portada y plato). Deja fotos: pasa `pnpm e2e reset` después. |
| `translations` | Avisos de traducción por idioma y sección, y bloqueo al publicar con textos a medias. |
| `spaces-languages` | Entrar a editar: resumen y menú de apartados del restaurante (desplegable en móvil), añadir, ordenar y eliminar espacios, idiomas de la web, dirección de la web, pestañas del espacio y alta de restaurantes. |
| `users-languages` | Ajustes: alta de usuario con enlace, elegir contraseña, suspender, idiomas. |

## A tener en cuenta

- El api limita a **100 peticiones por minuto y usuario**: por eso las pruebas llevan pausas.
  Lanzar dos seguidas sin esperar un minuto puede dar errores 429 que no son fallos reales.
- `images` lleva fijados los ids del espacio y de un plato de «pruebas». Si se recrea ese
  restaurante, hay que actualizarlos (`SPACE` y `DISH` al principio del archivo).
- La auditoría final de varias pruebas usa la herramienta personal `~/.claude/tools/ux-a11y-audit.cjs`.
  Sin ella, ese último paso falla; el resto de la prueba no depende de ella.
- Un aviso emergente a medio desvanecerse da un falso «contraste insuficiente»: las pruebas
  esperan a que desaparezca antes de auditar.
