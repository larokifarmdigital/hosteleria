# La Principal — Checklist Go-Live

Análisis y roadmap para llevar la landing de La Principal a producción en un dominio propio (o vercel.app provisional), con SEO/GEO, performance, legal y todo lo necesario para funcionar bien.

Marcaje: `- [x]` = hecho · `- [ ]` = pendiente · `- [~]` = parcial/opcional.

---

## ✅ Estado actual — lo que YA funciona

### CMS y contenido
- [x] Doc `restaurante` en Sanity con todos los groups (identidad, hero, manifiesto, sobre, galería, grupos, horarios, contacto, redes, textos UI, SEO, IA)
- [x] Categorías + vinos + platos gestionables desde Sanity
- [x] Idiomas configurables (ES + EN activos)
- [x] Textos UI (nav, form, footer) editables por el cliente
- [x] Toggle `mostrarRedes: true` (Instagram visible en Footer y overlay móvil)
- [x] Campo `anyoFundacion: 1985` → sello dinámico "Est. 1985 · Sant Antoni" en el hero
- [x] Puntos destacados de grupos (`gruposDestacados`) editables — 3 items iniciales

### SEO clásico
- [x] `<title>` + meta description por locale
- [x] `<link rel="canonical">` por locale
- [x] `<link rel="alternate" hreflang>` (es, en, x-default)
- [x] Open Graph tags (title, description, image, locale, url, type)
- [x] Twitter cards
- [x] JSON-LD `Restaurant` enriquecido:
  - name, description (del resumenIA), url, logo, image
  - priceRange auto-calculado de `precioMedio: 32`
  - servesCuisine, acceptsReservations (true), paymentAccepted, smokingAllowed
  - address (PostalAddress), geo (GeoCoordinates auto-extraídas del `mapaUrl`)
  - telephone, email
  - openingHoursSpecification por día y turno
  - hasMap, amenityFeature
- [x] JSON-LD `FAQPage` con 7 Q&A
- [x] `<html lang>` dinámico

### GEO / IA (Generative Engine Optimization)
- [x] `/robots.txt` con Allow explícito para 16 crawlers de IA (GPTBot, PerplexityBot, Google-Extended, ClaudeBot, etc.)
- [x] `/llms.txt` dinámico (markdown con datos + horario + carta completa + FAQ)
- [x] Resumen IA (campo `resumenIA` en Sanity)
- [x] FAQ visible en la landing (accordion, numeración romana editorial) — LLMs leen HTML puro
- [x] Servicios extras (`grupos`, `sala_privada`, `carta_vinos`, `menu_dia`, `familiar`) y formas de pago estructurados

### PWA
- [x] `/site.webmanifest` dinámico con iconos (192, 512, maskable)
- [x] Favicon (fallback + Sanity)
- [x] Apple touch icon (fallback + Sanity con `pngSquare`)
- [x] `<meta name="theme-color">` con `accentColor` local (`#8a3a4a` borgoña)
- [x] Viewport meta con mínimo 375px

### i18n
- [x] Rutas dinámicas `/` (ES) y `/en/` con `getStaticPaths`
- [x] Todo el copy visible traducido (fallback al defaultLocale)
- [x] Language switcher (nav desktop + overlay móvil)
- [x] Google Maps embed localizado
- [x] Chrome del calendario/booking traducido (bookingStrings)
- [x] Copa/Botella traducido en Wines (Copa/Glass/Copa, Botella/Bottle/Ampolla)

### Diseño y UX (identidad propia)
- [x] Paleta bordó `#8a3a4a` + crema `#faf4ea` + salmón `#e08a72` (brasserie catalana editorial)
- [x] Tipografía Cormorant Garamond (serif editorial) + Inter (sans neutral) — self-hosted (Fontsource)
- [x] Layout **distinto** de casabella (dark honey) y guixot (ivory + navy):
  - Hero split 45/55 con sello dinámico "Est. {año} · {barrio}"
  - Manifesto con reglas ornamentales `❦` y firma familiar
  - About stack vertical adaptativo (1/2/3 imágenes en fila abajo)
  - Dishes/Wines con leader dots (puntitos hacia el precio, look brasserie)
  - Gallery estilo polaroids sobre pared (rotación pseudo-aleatoria)
  - Groups con imagen "postal" + etiqueta rotada
  - Faq con numeración romana (i, ii, iii…)
  - Map con filtro cálido (sepia sutil, no grayscale plano)
- [x] Responsive (mobile ≥375px hasta desktop)
- [x] Nav sticky cream semitransparente con overlay móvil full-screen (hamburger)
- [x] Formulario de reserva (7 campos con validators + date/time pickers custom)
- [x] Botón WhatsApp flotante (verde 25D366, outline borgoña, prellenado por locale)
- [x] Galería con lightbox
- [x] Reveal on scroll
- [x] Focus states para navegación por teclado
- [x] `prefers-reduced-motion` respetado

### Data/Sanity
- [x] Campo `mapaUrl` cubre iframe + coords JSON-LD + link externo (extracción automática con regex)
- [x] Schema restaurante compartido en `packages/sanity-schema` (no duplicado por app)

---

## 🔴 BLOQUEANTES — no se puede publicar sin esto

### Legal (RGPD + LSSI-CE, obligatorio en España)
- [x] **Aviso legal** — plantilla base ES+EN en Sanity, con `[COMPLETAR]` para CIF/titular
- [x] **Política de privacidad** — plantilla base ES+EN, form de reserva + derechos RGPD
- [x] **Política de cookies** — plantilla base ES+EN (no cookies con Cloudflare Web Analytics → informativa)
- [x] **Sin banner de consentimiento** — Cloudflare Web Analytics no usa cookies ni fingerprinting, exento del banner
- [x] Enlaces a las 3 páginas legales en el footer (index + `/en/`)
- [ ] Cliente rellena `[COMPLETAR]` de CIF/NIF, titular, dirección fiscal en Sanity

### Técnicos
- [x] **`/sitemap.xml`** dinámico con hreflang alternates (home + legal, ES + EN)
- [x] **Página 404 custom** con branding y links de vuelta al home por idioma
- [ ] **Deploy configurado** en Vercel/Netlify/Cloudflare Pages
  - [x] `astro.config.mjs` con `site: https://laprincipal.vercel.app` (provisional)
  - [ ] Variables de entorno en el hosting (SANITY_PROJECT_ID + SANITY_DATASET + RESTAURANT_SLUG)
  - [ ] Webhook Sanity → rebuild al publicar
  - [ ] SSL automático
  - [ ] Dominio propio apuntando (registro DNS) — decidir dominio final
- [x] **Analytics** — Cloudflare Web Analytics integrado (script cargado si `cloudflareAnalyticsToken` está definido en Sanity); gratis, sin cookies, sin banner
  - [ ] Cliente da de alta el sitio en dash.cloudflare.com → Analytics & Logs → Web Analytics, y pega el token en Sanity

---

## 🟠 CRÍTICOS — impactan directamente al negocio

- [ ] **Sistema de reservas real** (actualmente mailto)
  - Opciones: Formspree, Basin, Cloudflare Function, TheFork/CoverManager
  - Impacto: móvil sin cliente de correo pierde reservas
- [ ] **Confirmación de reserva al cliente y al restaurante** (email/SMS/WhatsApp)
- [ ] **Google Business Profile** reclamado y bien rellenado (fotos, horario, categoría) — SEO local impacto más grande que la web misma
- [ ] **Email `hola@laprincipal.com`** verificar que existe y alguien lo lee
- [ ] **Fotos reales** del restaurante subidas a Sanity (hero, galería, sobre, grupos)
- [ ] **Logo del restaurante** subido a Sanity (JSON-LD + OG fallback)
- [ ] **Icono PWA + favicon** reales del cliente (no los placeholders)

---

## 🟡 PERFORMANCE — mejoras recomendadas

- [x] Self-host de fonts (Cormorant Garamond + Inter) con Fontsource
- [x] `<link rel="preconnect">` a `cdn.sanity.io` (imágenes)
- [ ] Usar `<Image>` de Astro para imágenes locales (fallbacks en `public/img/`) — optimización automática WebP/AVIF
- [ ] `<link rel="preload">` de fuente crítica del heading (Cormorant Garamond)
- [ ] Verificar cache headers en el hosting (Cache-Control largos para assets)
- [ ] Compresión Brotli — automática en Vercel/Cloudflare/Netlify
- [ ] Auditoría Lighthouse post-deploy (mobile + desktop)
- [ ] Content Security Policy (CSP) headers en el hosting

---

## 🟢 UX / ACCESIBILIDAD

- [x] Skip navigation link (`<a href="#main">Saltar al contenido</a>` visible con teclado)
- [x] `<meta name="robots" content="index,follow">` explícito
- [x] `<html lang="es-ES">` regional
- [x] `prefers-reduced-motion` respetado en todas las animaciones
- [ ] Auditoría accesibilidad con axe DevTools
- [ ] Verificar contraste de colores (paleta bordó + cream — validar WCAG AA)
- [ ] Iconos SVG con `<title>` para screen readers donde aplique

---

## 🟢 NICE TO HAVE

- [ ] Newsletter signup (Mailchimp/ConvertKit/Sanity)
- [ ] `/.well-known/security.txt`
- [ ] `humans.txt` con créditos
- [ ] JSON-LD `Menu` por plato individual (rich cards en Google)
- [ ] JSON-LD `BreadcrumbList` (SEO)
- [ ] Rich Results Test verificar cada JSON-LD emitido
- [ ] Preview del OG image en debuggers (Facebook, Twitter, LinkedIn)

---

## Orden sugerido de ataque

### Fase 1 — Contenido del cliente
1. Subir fotos reales a Sanity (hero, sobre — hasta 3 imágenes, galería, grupos)
2. Subir logo + favicon + iconoApp desde Sanity Studio
3. Rellenar `[COMPLETAR]` de CIF/NIF, titular, dirección fiscal en las 3 páginas legales
4. Confirmar / editar los 7 items de FAQ inicial (o añadir más)

### Fase 2 — Deploy
5. Deploy en Vercel (proyecto `la-principal-vercel` o similar)
6. Env vars: SANITY_PROJECT_ID, SANITY_DATASET=production, RESTAURANT_SLUG=la-principal
7. Webhook Sanity → deploy hook Vercel (rebuild al publicar)
8. Cliente confirma dominio final → DNS → cambiar `site` en `astro.config.mjs`

### Fase 3 — Analytics + reservas
9. Cliente da de alta Cloudflare Web Analytics, pega token en Sanity
10. Sistema de reservas real (Formspree recomendado por rapidez) o TheFork
11. Verificar Google Business Profile

### Fase 4 — Performance + pulido
12. `<Image>` de Astro
13. Preloads/preconnects de fuentes
14. Auditoría Lighthouse
15. axe audit + CSP headers
16. Rich Results Test

---

## Decisiones pendientes del cliente

- [x] ~~Elegir analytics~~ → **Cloudflare Web Analytics** (integrado, gratis, sin cookies)
- [ ] Elegir **sistema de reservas**: Formspree (~10€/mes, forma simple) o TheFork/CoverManager (integración pro)
- [x] Elegir **hosting**: **Vercel** (dominio provisional `laprincipal.vercel.app` ya configurado en `astro.config.mjs`)
- [ ] Confirmar **dominio final** (laprincipal.com? .cat? .bcn?)
- [x] ~~Redactar textos legales~~ → **Plantilla A** aplicada; cliente rellena `[COMPLETAR]` desde Sanity

---

_Última actualización: 2026-08-21_
