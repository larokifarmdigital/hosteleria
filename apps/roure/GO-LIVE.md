# Roure — Checklist Go-Live

Análisis y roadmap para llevar la landing de Roure a producción en un dominio propio (o vercel.app provisional), con SEO/GEO, performance, legal y todo lo necesario para funcionar bien.

Marcaje: `- [x]` = hecho · `- [ ]` = pendiente · `- [~]` = parcial/opcional.

---

## ✅ Estado actual — lo que YA funciona

### CMS y contenido
- [x] Doc `restaurante` en el backoffice con todos los groups (identidad, hero, manifiesto, sobre, galería, grupos, horarios, contacto, redes, textos UI, SEO, IA)
- [x] Categorías + vinos + platos gestionables desde el backoffice
- [x] Idiomas configurables (ES + EN activos)
- [x] Textos UI (nav, form, footer) editables por el cliente
- [x] Toggle `mostrarRedes: true` (Instagram visible en Footer y overlay móvil)
- [x] Campo `anyoFundacion: 2016` → sello dinámico "Est. 2016 · El Born" en el hero
- [x] Puntos destacados de grupos (`gruposDestacados`) editables — 3 items iniciales (hasta 35 comensales, menú maridado con bodega, sala privada)

### SEO clásico
- [x] `<title>` + meta description por locale
- [x] `<link rel="canonical">` por locale
- [x] `<link rel="alternate" hreflang>` (es, en, x-default)
- [x] Open Graph tags (title, description, image, locale, url, type)
- [x] Twitter cards
- [x] JSON-LD `Restaurant` enriquecido:
  - name, description (del resumenIA), url, logo, image
  - priceRange auto-calculado de `precioMedio: 42`
  - servesCuisine, acceptsReservations (true), paymentAccepted, smokingAllowed
  - address (PostalAddress), geo (GeoCoordinates auto-extraídas del `mapaUrl`)
  - telephone, email
  - openingHoursSpecification por día y turno
  - hasMap, amenityFeature
- [x] JSON-LD `FAQPage` con 7 Q&A específicas (incluye pregunta sobre la bodega y vinos naturales)
- [x] `<html lang>` dinámico

### GEO / IA (Generative Engine Optimization)
- [x] `/robots.txt` con Allow explícito para 16 crawlers de IA
- [x] `/llms.txt` dinámico con datos + horario + carta completa + FAQ
- [x] Resumen IA (campo `resumenIA` en el backoffice)
- [x] FAQ visible en la landing
- [x] Servicios extras (`carta_vinos`, `grupos`, `sala_privada`, `menu_degustacion`, `bar`) y formas de pago estructurados

### PWA
- [x] `/site.webmanifest` dinámico con iconos (192, 512, maskable)
- [x] Favicon (fallback + backoffice)
- [x] Apple touch icon (fallback + backoffice con `pngSquare`)
- [x] `<meta name="theme-color">` con `accentColor` local (`#2f4a2c` verde bosque profundo)
- [x] Viewport meta con mínimo 375px

### i18n
- [x] Rutas dinámicas `/` (ES) y `/en/` con `getStaticPaths`
- [x] Todo el copy visible traducido (fallback al defaultLocale)
- [x] Language switcher (nav desktop + overlay móvil)
- [x] Google Maps embed localizado
- [x] Chrome del calendario/booking traducido (bookingStrings)
- [x] Copa/Botella traducido en Wines

### Diseño y UX (identidad propia — bodega contemporánea)
- [x] Paleta forestal única: off-white cálido `#f4efe4` + verde bosque profundo `#2f4a2c` + óxido cobre `#b56b3a`
- [x] Tipografía **Marcellus** (serif roman clásica boutique) + **Space Grotesk Variable** (sans peculiar) — self-hosted GDPR-safe
- [x] Layout **distinto** de casabella, guixot, la-principal y pubilla:
  - Hero split 55/45 (heredado casabella, adaptado a paleta bosque)
  - Manifesto centrado editorial
  - About stack vertical adaptativo (1/2/3 imágenes)
  - Dishes/Wines con hover translate + shadow accent
  - Gallery grid asimétrico con lightbox
  - Groups split editorial
  - Faq acordeón con numeración simple
  - Booking form 2 cols dark elegante
  - Map con iframe filtered
- [x] MobileOverlay propio con **links CENTRADOS + arrow al hover + sello "Cellier · 2016" rotado**
- [x] Responsive (mobile ≥375px hasta desktop)
- [x] Nav sticky off-white semitransparente con overlay móvil full-screen
- [x] Formulario de reserva (7 campos con validators + date/time pickers custom)
- [x] Botón WhatsApp flotante (verde 25D366, outline verde bosque)
- [x] Galería con lightbox
- [x] Reveal on scroll
- [x] Focus states para navegación por teclado
- [x] `prefers-reduced-motion` respetado

---

## 🔴 BLOQUEANTES — no se puede publicar sin esto

### Legal (RGPD + LSSI-CE, obligatorio en España)
- [x] **Aviso legal** — plantilla base ES+EN en el backoffice, con `[COMPLETAR]` para CIF/titular
- [x] **Política de privacidad** — plantilla base ES+EN
- [x] **Política de cookies** — plantilla base ES+EN
- [x] **Sin banner de consentimiento** — Cloudflare Web Analytics exento
- [x] Enlaces a las 3 páginas legales en el footer
- [ ] Cliente rellena `[COMPLETAR]` de CIF/NIF, titular, dirección fiscal en el backoffice

### Técnicos
- [x] **`/sitemap.xml`** dinámico con hreflang alternates (home + legal, ES + EN)
- [x] **Página 404 custom** con branding y links de vuelta al home por idioma
- [ ] **Deploy configurado** en Vercel/Netlify/Cloudflare Pages
  - [x] `astro.config.mjs` con `site: https://roure-cat.vercel.app` (provisional)
  - [ ] SSL automático
  - [ ] Dominio propio apuntando (registro DNS) — `roure.cat` ya reservado en el backoffice
- [x] **Analytics** — Cloudflare Web Analytics integrado
  - [ ] Cliente da de alta el sitio en dash.cloudflare.com y pega el token en el backoffice

---

## 🟠 CRÍTICOS — impactan directamente al negocio

- [ ] **Sistema de reservas real** (actualmente mailto) — Formspree/Basin/TheFork/CoverManager
- [ ] **Confirmación de reserva** email/SMS/WhatsApp al cliente y al restaurante
- [ ] **Google Business Profile** reclamado — SEO local impacto más grande que la web
- [ ] **Email `hola@roure.cat`** verificar que existe y alguien lo lee
- [ ] **Fotos reales** subidas al backoffice (hero, galería, sobre — hasta 3, grupos)
- [ ] **Logo del restaurante** subido al backoffice (JSON-LD + OG fallback)
- [ ] **Icono PWA + favicon** reales del cliente

---

## 🟡 PERFORMANCE — mejoras recomendadas

- [x] Self-host de fonts (Marcellus + Space Grotesk) con Fontsource
- [ ] `<Image>` de Astro para imágenes locales
- [ ] `<link rel="preload">` de fuente crítica del heading (Marcellus)
- [ ] Verificar cache headers en el hosting
- [ ] Compresión Brotli — automática en Vercel/Cloudflare/Netlify
- [ ] Auditoría Lighthouse post-deploy
- [ ] Content Security Policy (CSP) headers

---

## 🟢 UX / ACCESIBILIDAD

- [x] Skip navigation link
- [x] `<meta name="robots" content="index,follow">` explícito
- [x] `<html lang="es-ES">` regional
- [x] `prefers-reduced-motion` respetado en todas las animaciones
- [ ] Auditoría accesibilidad con axe DevTools
- [ ] Verificar contraste WCAG AA (paleta bosque + off-white)

---

## 🟢 NICE TO HAVE

- [ ] Newsletter signup (Roure encaja bien con newsletter tipo "recomendaciones de la bodega")
- [ ] Ficha detallada de vinos (JSON-LD `Product` por botella destacada)
- [ ] `/.well-known/security.txt`
- [ ] `humans.txt`
- [ ] Rich Results Test verificar cada JSON-LD

---

## Orden sugerido de ataque

### Fase 1 — Contenido del cliente
1. Subir fotos reales al backoffice (hero, sobre — hasta 3, galería, grupos)
2. Subir logo + favicon + iconoApp
3. Rellenar `[COMPLETAR]` de CIF/NIF, titular, dirección fiscal en las 3 páginas legales
4. Confirmar / editar las 7 FAQs iniciales

### Fase 2 — Deploy
5. Deploy en Vercel (proyecto `roure-vercel` o similar)
8. Cliente confirma dominio final → DNS → cambiar `site` en `astro.config.mjs`

### Fase 3 — Analytics + reservas
9. Cliente da de alta Cloudflare Web Analytics, pega token en el backoffice
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

- [x] ~~Elegir analytics~~ → **Cloudflare Web Analytics**
- [ ] Elegir **sistema de reservas**: Formspree o TheFork/CoverManager (Roure con bodega puede pedir integración pro)
- [x] Elegir **hosting**: **Vercel** (`roure-cat.vercel.app` provisional en `astro.config.mjs`)
- [ ] Confirmar **dominio final** (`roure.cat` está reservado en el backoffice)
- [x] ~~Redactar textos legales~~ → **Plantilla A** aplicada; cliente rellena `[COMPLETAR]` desde el backoffice

---

_Última actualización: 2026-08-21_
