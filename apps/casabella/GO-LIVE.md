# Casabella — Checklist Go-Live

Análisis y roadmap para llevar la landing de Casabella a producción en un dominio propio, con SEO/GEO, performance, legal y todo lo necesario para funcionar bien.

Marcaje: `- [x]` = hecho · `- [ ]` = pendiente · `- [~]` = parcial/opcional.

---

## ✅ Estado actual — lo que YA funciona

### CMS y contenido
- [x] Doc `restaurante` en Sanity con todos los groups (identidad, hero, manifiesto, sobre, galería, grupos, horarios, contacto, redes, textos UI, SEO, IA)
- [x] Categorías + vinos + platos gestionables desde Sanity
- [x] Idiomas configurables (ES + EN activos)
- [x] Textos UI (nav, form, footer) editables por el cliente
- [x] Toggles `mostrarRedes` y `mostrarResenas` (default false)

### SEO clásico
- [x] `<title>` + meta description por locale
- [x] `<link rel="canonical">` por locale
- [x] `<link rel="alternate" hreflang>` (es, en, x-default)
- [x] Open Graph tags (title, description, image, locale, url, type)
- [x] Twitter cards
- [x] JSON-LD `Restaurant` enriquecido:
  - name, description (del resumenIA), url, logo, image
  - priceRange auto-calculado de `precioMedio`
  - servesCuisine, acceptsReservations, paymentAccepted, smokingAllowed
  - address (PostalAddress), geo (GeoCoordinates auto-extraídas del `mapaUrl`)
  - telephone, email
  - openingHoursSpecification por día y turno
  - hasMap, amenityFeature
- [x] JSON-LD `FAQPage` con Q&A
- [x] `<html lang>` dinámico
- [x] `<meta property="og:locale">` por locale

### GEO / IA (Generative Engine Optimization)
- [x] `/robots.txt` con Allow explícito para 16 crawlers de IA (GPTBot, PerplexityBot, Google-Extended, ClaudeBot, etc.)
- [x] `/llms.txt` dinámico (markdown con datos + horario + carta completa + FAQ)
- [x] Resumen IA (campo `resumenIA` en Sanity)
- [x] FAQ visible en la landing (accordion) — LLMs leen HTML puro
- [x] Servicios extras y formas de pago estructurados

### PWA
- [x] `/site.webmanifest` dinámico con iconos (192, 512, maskable)
- [x] Favicon (fallback + Sanity)
- [x] Apple touch icon (fallback + Sanity con `pngSquare`)
- [x] `<meta name="theme-color">` con `colorMarca`
- [x] Viewport meta con mínimo 375px

### i18n
- [x] Rutas dinámicas `/` (ES) y `/en/` con `getStaticPaths`
- [x] Todo el copy visible traducido (fallback al defaultLocale)
- [x] Language switcher (nav desktop + overlay móvil)
- [x] Google Maps embed localizado (`!1s<lang>` dentro del pb=)
- [x] Enlace externo a Google Maps localizado con `?hl=`

### Diseño y UX
- [x] Responsive (mobile ≥375px hasta desktop)
- [x] Dark warm coherente
- [x] Nav sticky con overlay móvil full-screen (hamburger)
- [x] Formulario de reserva (7 campos)
- [x] Botón WhatsApp flotante (verde 25D366, prellenado por locale)
- [x] Galería con lightbox
- [x] Reveal on scroll (sin parallax excesivo)
- [x] Focus states para navegación por teclado
- [x] `prefers-reduced-motion` respetado
- [x] Sección map con iframe + link "Ver en Google Maps" (usa CID directo)

### Data/Sanity
- [x] Campo `mapaUrl` cubre iframe + coords JSON-LD + link externo (extracción automática con regex)
- [x] Campo `coordenadas` retirado (redundante con `mapaUrl`)

---

## 🔴 BLOQUEANTES — no se puede publicar sin esto

### Legal (RGPD + LSSI-CE, obligatorio en España)
- [x] **Aviso legal** — plantilla base ES+EN en Sanity, con `[COMPLETAR]` para CIF/titular
- [x] **Política de privacidad** — plantilla base ES+EN, form de reserva + derechos RGPD
- [x] **Política de cookies** — plantilla base ES+EN (no cookies con Cloudflare Web Analytics → informativa)
- [x] **Sin banner de consentimiento** — Cloudflare Web Analytics no usa cookies ni fingerprinting, exento del banner
- [x] Enlaces a las 3 páginas legales en el footer (index + `/en/`)
- [ ] Cliente rellena `[COMPLETAR]` de CIF/NIF, titular, dirección fiscal en Sanity

**Hecho**: schema `paginaLegal` en Sanity (titulo i18n + contenido rich text i18n + fecha), rutas `/legal/[slug]` y `/en/legal/[slug]`, plantillas ES+EN inyectadas por seed.

### Técnicos
- [x] **`/sitemap.xml`** dinámico con hreflang alternates (home + legal, ES + EN)
- [x] **Página 404 custom** con branding y links de vuelta al home por idioma
- [ ] **Deploy configurado** en Vercel/Netlify/Cloudflare Pages
  - [ ] Variables de entorno en el hosting (SANITY_PROJECT_ID)
  - [ ] Webhook Sanity → rebuild al publicar
  - [ ] SSL automático
  - [ ] Dominio propio apuntando (registro DNS)
- [x] **Analytics** — Cloudflare Web Analytics integrado (script cargado si `cloudflareAnalyticsToken` está definido en Sanity); gratis, sin cookies, sin banner
  - [ ] Cliente da de alta el sitio en dash.cloudflare.com → Analytics & Logs → Web Analytics, y pega el token en Sanity

---

## 🟠 CRÍTICOS — impactan directamente al negocio

- [ ] **Sistema de reservas real** (actualmente mailto)
  - Opciones: Formspree, Basin, Cloudflare Function, TheFork/CoverManager
  - Impacto: móvil sin cliente de correo pierde reservas
- [ ] **Confirmación de reserva al cliente y al restaurante** (email/SMS/WhatsApp)
- [ ] **Google Business Profile** reclamado y bien rellenado (fotos, horario, categoría) — SEO local impacto más grande que la web misma
- [ ] **Email `hola@casabella.com`** verificar que existe y alguien lo lee
- [ ] **Fotos reales** del restaurante subidas a Sanity (hero, galería, sobre, hire)
- [ ] **Logo del restaurante** subido a Sanity (JSON-LD + OG fallback)
- [ ] **Icono PWA + favicon** reales del cliente (no los placeholders)

---

## 🟡 PERFORMANCE — mejoras recomendadas

- [ ] Usar `<Image>` de Astro para imágenes locales (fallbacks en `public/img/`) — optimización automática WebP/AVIF
- [ ] Self-host de Google Fonts (Fraunces + Inter) con Fontsource — quita ~150ms de latencia
- [ ] `<link rel="preload">` de fuente crítica del heading (Fraunces)
- [ ] `<link rel="preconnect">` a `cdn.sanity.io` (imágenes)
- [ ] Verificar cache headers en el hosting (Cache-Control largos para assets)
- [ ] Compresión Brotli — automática en Vercel/Cloudflare/Netlify
- [ ] Auditoría Lighthouse post-deploy (mobile + desktop)
- [ ] Content Security Policy (CSP) headers en el hosting

---

## 🟢 UX / ACCESIBILIDAD

- [ ] Skip navigation link (`<a href="#main">Saltar al contenido</a>` visible con teclado)
- [ ] Auditoría accesibilidad con axe DevTools
- [ ] `<meta name="robots" content="index,follow">` explícito (aunque default)
- [ ] `<html lang="es-ES">` regional (opcional, mejora hreflang)
- [ ] Verificar contraste de colores (paleta dark warm — validar WCAG AA)
- [ ] Iconos SVG con `<title>` para screen readers donde aplique

---

## 🟢 NICE TO HAVE

- [ ] Newsletter signup (Mailchimp/ConvertKit/Sanity)
- [ ] `/.well-known/security.txt`
- [ ] `humans.txt` con créditos
- [ ] JSON-LD `Menu` por plato individual (rich cards en Google)
- [ ] JSON-LD `BreadcrumbList` (SEO)
- [ ] Botones share (irónico, cliente dijo no rrss)
- [ ] Rich Results Test verificar cada JSON-LD emitido
- [ ] Preview del OG image en debuggers (Facebook, Twitter, LinkedIn)

---

## Orden sugerido de ataque

### Fase 1 — Legal (bloqueante para publicar)
1. Schema `paginaLegal` en Sanity + seed con contenido base ES/EN
2. Rutas `/legal/[slug]` en Astro
3. Enlaces en footer
4. Decidir analytics → Plausible (sin cookies) o GA4 (con cookies)
5. Si GA4: banner de consentimiento

### Fase 2 — Técnicos (bloqueante para deploy)
6. ~~Endpoint `/sitemap.xml` dinámico~~ ✅
7. ~~Página `src/pages/404.astro`~~ ✅
8. Deploy en Vercel/Cloudflare Pages
9. Configurar dominio propio + DNS
10. Webhook Sanity → deploy

### Fase 3 — Críticos negocio
11. Sistema de reservas real (Formspree recomendado por rapidez)
12. Cliente sube fotos + logo + icono real
13. Verificar Google Business Profile

### Fase 4 — Performance
14. `<Image>` de Astro
15. Self-host fuentes
16. Preloads/preconnects
17. Auditoría Lighthouse

### Fase 5 — Pulido
18. Skip nav + axe audit
19. CSP headers
20. Rich Results Test
21. Newsletter/security.txt (si aplica)

---

## Decisiones pendientes del cliente

- [x] ~~Elegir analytics~~ → **Cloudflare Web Analytics** (integrado, gratis, sin cookies)
- [ ] Elegir **sistema de reservas**: Formspree (~10€/mes, forma simple) o TheFork/CoverManager (integración pro)
- [ ] Elegir **hosting**: Vercel / Netlify / Cloudflare Pages
- [ ] Confirmar **dominio final** (casabella.com? .cat? .bcn?)
- [x] ~~Redactar textos legales~~ → **Plantilla A** aplicada; cliente rellena `[COMPLETAR]` desde Sanity

---

_Última actualización: 2026-08-17_
