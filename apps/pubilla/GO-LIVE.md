# La Pubilla — Checklist Go-Live

Análisis y roadmap para llevar la landing de La Pubilla a producción en un dominio propio (o vercel.app provisional), con SEO/GEO, performance, legal y todo lo necesario para funcionar bien.

Marcaje: `- [x]` = hecho · `- [ ]` = pendiente · `- [~]` = parcial/opcional.

---

## ✅ Estado actual — lo que YA funciona

### CMS y contenido
- [x] Doc `restaurante` en el backoffice con todos los groups (identidad, hero, manifiesto, sobre, galería, grupos, horarios, contacto, redes, textos UI, SEO, IA)
- [x] Categorías + vinos + platos gestionables desde el backoffice
- [x] Idiomas configurables (ES + EN activos)
- [x] Textos UI (nav, form, footer) editables por el cliente
- [x] Toggle `mostrarRedes: true` (Instagram visible en Footer y overlay móvil)
- [x] Campo `anyoFundacion: 1926` → sello dinámico "Est. 1926 · Gràcia" en el hero
- [x] Puntos destacados de grupos (`gruposDestacados`) editables — 3 items iniciales

### SEO clásico
- [x] `<title>` + meta description por locale
- [x] `<link rel="canonical">` por locale
- [x] `<link rel="alternate" hreflang>` (es, en, x-default)
- [x] Open Graph tags (title, description, image, locale, url, type)
- [x] Twitter cards
- [x] JSON-LD `Restaurant` enriquecido:
  - name, description (del resumenIA), url, logo, image
  - priceRange auto-calculado de `precioMedio: 25`
  - servesCuisine, acceptsReservations (true), paymentAccepted, smokingAllowed
  - address (PostalAddress), geo (GeoCoordinates auto-extraídas del `mapaUrl`)
  - telephone, email
  - openingHoursSpecification por día y turno
  - hasMap, amenityFeature
- [x] JSON-LD `FAQPage` con 6 Q&A específicas (menú del día, horarios desayuno, etc.)
- [x] `<html lang>` dinámico

### GEO / IA (Generative Engine Optimization)
- [x] `/robots.txt` con Allow explícito para 16 crawlers de IA
- [x] `/llms.txt` dinámico con datos + horario + carta completa + FAQ
- [x] Resumen IA (campo `resumenIA` en el backoffice)
- [x] FAQ visible en la landing (accordion, numeración `01.` + glifo ✦) — LLMs leen HTML puro
- [x] Servicios extras (`grupos`, `menu_dia`, `sala_privada`, `familiar`, `bar`, `carta_vinos`) y formas de pago estructurados

### PWA
- [x] `/site.webmanifest` dinámico con iconos (192, 512, maskable)
- [x] Favicon (fallback + backoffice)
- [x] Apple touch icon (fallback + backoffice con `pngSquare`)
- [x] `<meta name="theme-color">` con `accentColor` local (`#2f4b7c` azul cobalto Modernista)
- [x] Viewport meta con mínimo 375px

### i18n
- [x] Rutas dinámicas `/` (ES) y `/en/` con `getStaticPaths`
- [x] Todo el copy visible traducido (fallback al defaultLocale)
- [x] Language switcher (nav desktop + overlay móvil)
- [x] Google Maps embed localizado
- [x] Chrome del calendario/booking traducido (bookingStrings)
- [x] Copa/Botella traducido en Wines

### Diseño y UX (identidad propia)
- [x] Paleta blanco roto `#fbf6ec` + azul cobalto Modernista `#2f4b7c` + gris topo cálido `#8a7a68`
- [x] Tipografía Newsreader Variable (serif humanista) + Karla Variable (sans humanista) — self-hosted GDPR-safe
- [x] Layout **distinto** de casabella, guixot, la-principal y roure:
  - Hero split 55/45 con foto polaroid rotada + caption "Casa desde 1926"
  - Manifesto con marco doble + asterismo `∗ ∗ ∗`
  - About stack vertical adaptativo (1/2/3 imágenes en fila abajo)
  - Dishes/Wines con numeración `01./02./03.` italic azul cobalto + leader dots
  - Gallery estilo álbum de recortes con washi tape simulado al hover
  - Groups banner full-width con imagen visible + scrim central legible
  - Faq acordeón con numeración `01.` + glifo `✦` que se ilumina al abrir
  - Booking hoja de reserva con marco doble + inputs font-serif italic
  - Map tarjeta postal con marco cream + sticker rotado "Postal"
- [x] MobileOverlay propio con lenguaje "recetario numerado"
- [x] Responsive (mobile ≥375px hasta desktop)
- [x] Nav sticky blanco roto semitransparente con overlay móvil full-screen (hamburger)
- [x] Formulario de reserva (7 campos con validators + date/time pickers custom)
- [x] Botón WhatsApp flotante (verde 25D366, outline cobalto)
- [x] Galería con lightbox
- [x] Reveal on scroll
- [x] Focus states para navegación por teclado
- [x] `prefers-reduced-motion` respetado

---

## 🔴 BLOQUEANTES — no se puede publicar sin esto

### Legal (RGPD + LSSI-CE, obligatorio en España)
- [x] **Aviso legal** — plantilla base ES+EN en el backoffice, con `[COMPLETAR]` para CIF/titular
- [x] **Política de privacidad** — plantilla base ES+EN
- [x] **Política de cookies** — plantilla base ES+EN (Cloudflare Web Analytics no usa cookies → informativa)
- [x] **Sin banner de consentimiento** — Cloudflare Web Analytics exento
- [x] Enlaces a las 3 páginas legales en el footer
- [ ] Cliente rellena `[COMPLETAR]` de CIF/NIF, titular, dirección fiscal en el backoffice

### Técnicos
- [x] **`/sitemap.xml`** dinámico con hreflang alternates (home + legal, ES + EN)
- [x] **Página 404 custom** con branding y links de vuelta al home por idioma
- [ ] **Deploy configurado** en Vercel/Netlify/Cloudflare Pages
  - [x] `astro.config.mjs` con `site: https://lapubilla.vercel.app` (provisional)
  - [ ] SSL automático
  - [ ] Dominio propio apuntando (registro DNS) — decidir dominio final (lapubilla.com está reservado en el backoffice)
- [x] **Analytics** — Cloudflare Web Analytics integrado
  - [ ] Cliente da de alta el sitio en dash.cloudflare.com y pega el token en el backoffice

---

## 🟠 CRÍTICOS — impactan directamente al negocio

- [ ] **Sistema de reservas real** (actualmente mailto) — Formspree/Basin/TheFork
- [ ] **Confirmación de reserva** email/SMS/WhatsApp al cliente y al restaurante
- [ ] **Google Business Profile** reclamado — SEO local impacto más grande que la web
- [ ] **Email `lapubillallibertat@gmail.com`** verificar que alguien lo lee
- [ ] **Fotos reales** subidas al backoffice (hero, galería, sobre — hasta 3, grupos)
- [ ] **Logo del restaurante** subido al backoffice
- [ ] **Icono PWA + favicon** reales del cliente

---

## 🟡 PERFORMANCE — mejoras recomendadas

- [x] Self-host de fonts (Newsreader + Karla) con Fontsource
- [ ] `<Image>` de Astro para imágenes locales
- [ ] `<link rel="preload">` de fuente crítica del heading (Newsreader)
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
- [ ] Verificar contraste WCAG AA (paleta blanco roto + cobalto)

---

## 🟢 NICE TO HAVE

- [ ] Newsletter signup
- [ ] `/.well-known/security.txt`
- [ ] `humans.txt`
- [ ] JSON-LD `Menu` por plato individual
- [ ] Rich Results Test verificar cada JSON-LD

---

## Orden sugerido de ataque

### Fase 1 — Contenido del cliente
1. Subir fotos reales al backoffice (hero, sobre — hasta 3, galería, grupos)
2. Subir logo + favicon + iconoApp
3. Rellenar `[COMPLETAR]` de CIF/NIF, titular, dirección fiscal en las 3 páginas legales
4. Confirmar / editar las 6 FAQs iniciales

### Fase 2 — Deploy
5. Deploy en Vercel (proyecto `pubilla-vercel` o similar)
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
- [ ] Elegir **sistema de reservas**: Formspree o TheFork/CoverManager
- [x] Elegir **hosting**: **Vercel** (`lapubilla.vercel.app` provisional en `astro.config.mjs`)
- [ ] Confirmar **dominio final** (lapubilla.com? .cat?)
- [x] ~~Redactar textos legales~~ → **Plantilla A** aplicada; cliente rellena `[COMPLETAR]` desde el backoffice

---

_Última actualización: 2026-08-21_
