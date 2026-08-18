# Hosteleria Sanity Studio

CMS único para todos los restaurantes del grupo. Un solo proyecto Sanity, un solo dataset (`production`), todos los docs se filtran por su referencia `restaurante`.

Convenciones y patrones alineados con **larokifarm** (proyecto hermano de farmacias): naming en español, todo el contenido de un restaurante en un solo doc con groups, cache de idiomas a nivel de módulo, validación "todos los idiomas activos o ninguno".

## Estructura del nav

```
CMS
├── 🌐 Idiomas             ← docs `idioma` (codigo, nombre)
└── Restaurantes           ← docs `restaurante`
    └── [click en uno]
        ├── 📄 Ficha        ← el doc `restaurante` entero (con groups internos)
        ├── 🍷 Vinos
        │   ├── Categorías
        │   └── Todos los vinos
        ├── 🍽 Platos
        │   ├── Categorías
        │   └── Todos los platos
        └── ⭐ Reseñas
```

Todos los listados dentro de un restaurante están filtrados por su ID vía GROQ — no se mezcla contenido entre restaurantes.

## Groups del doc `restaurante`

Toda la info del sitio vive en un único doc con estos groups:

- 🪪 Identidad — nombre, slug, dominio, color de marca, idioma por defecto, idiomas activos
- 🦸 Hero — títulos, meta, nota, CTA, imagen
- 💬 Manifiesto — eyebrow + frase manifiesto
- 👥 Sobre nosotros — eyebrow, título, párrafos, imágenes
- 🖼 Galería — carrusel del local
- 👨‍👩‍👧 Grupos y eventos — CTA para reservados
- 🕐 Horarios — texto + horario semanal con múltiples turnos por día
- 📞 Contacto — dirección, teléfono, email, WhatsApp, mapa (Google Maps embed URL)
- 📱 Redes sociales — Instagram, Facebook, TikTok
- 🔤 Textos de UI — nav, form de reserva, footer
- 🔍 SEO — title, description, imagen OG

## Cómo se gestionan los idiomas

- **Los idiomas viven en Sanity como docs `idioma`** con `codigo` (ISO 639-1) y `nombre`. El cliente añade/edita/elimina desde `🌐 Idiomas` en el nav.
- El plugin `sanity-plugin-internationalized-array` lee los idiomas del catálogo en runtime y muestra pestañas por idioma en cada campo multiidioma.
- **`sanity.config.ts` cachea la lista a nivel de módulo** — sin ese cache el plugin recibe una nueva referencia de array en cada render y provoca `Maximum update depth exceeded`.
- **Por restaurante**: en cada `restaurante`, el campo `idiomasActivos` es una referencia a docs `idioma`. Ahí eliges qué idiomas globales publica ESE restaurante.
- **Validación por campo (`validarTodosIdiomasOninguno`)**: si rellenas un idioma en un campo, tienes que rellenar todos los idiomas activos del restaurante en ese campo (o dejarlo vacío en todos). El helper vive en `packages/sanity-schema/src/lib/validacionI18n.ts`.

## Añadir un idioma nuevo

1. Crea un doc `idioma` (ej. `codigo: fr`, `nombre: Français`) desde 🌐 Idiomas.
2. Recarga el Studio (Ctrl+R).
3. Añade el código nuevo a `defaultLanguages` en `apps/studio/sanity.config.ts` (para que "Add language" lo pre-cree en campos vacíos).
4. En cada restaurante que quiera ese idioma, edita su `idiomasActivos`.

## Primer setup (una sola vez)

```bash
# 1. Instalar deps
pnpm install

# 2. Login en Sanity
pnpm --filter studio exec sanity login

# 3. Crear el proyecto (si no existe) desde sanity.io/manage

# 4. Configurar env
cp apps/studio/.env.example apps/studio/.env
# → edita apps/studio/.env y pega SANITY_STUDIO_PROJECT_ID=xxxxxxx

# 5. Arrancar
pnpm --filter studio dev
```

## Orden recomendado para poblar contenido

1. **Crea los idiomas primero** en 🌐 Idiomas: `es` / `ca` / `en`.
2. **Recarga (Ctrl+R)** — el plugin necesita releer el catálogo.
3. **Crea el restaurante** con nombre, slug, `idiomaPorDefecto` (ref a ES), `idiomasActivos` (refs a los que aplique).
4. Guarda y abre el restaurante → 📄 Ficha → rellena los groups.
5. Añade categorías de vino/plato antes de crear vinos/platos individuales.

## Deploy del Studio

```bash
pnpm --filter studio exec sanity deploy
# → pide subdominio, publica en <subdominio>.sanity.studio
```
