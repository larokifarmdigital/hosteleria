# Guixot — Checklist Go-Live

Landing de **Guixot** — cocina catalana de guisos en Sant Andreu, Barcelona.
Comparte arquitectura con Casabella (Tailwind utility-first, self-hosted fonts, sections modulares, etc.) pero con **identidad propia**:

- **Paleta**: ivory `#f5f0e6` + navy `#1e3a5f` + brass `#b8935a` (brasserie parisina refinada)
- **Fonts**: Bodoni Moda + Manrope (elegante clásico vs Fraunces + Manrope de Casabella)
- **Layout único**: hero horizontal split (foto derecha + texto izquierda), split-at-last-word en TODOS los H2, menu sections con rule horizontal, gallery grid asimétrico con posiciones específicas
- **Botones rectangulares** `rounded-sm` (vs pill dorado de Casabella)
- **Schedule agrupado en footer** — 1 fila con horario abierto + 1 fila con días cerrados (compacto)

Marcaje: `- [x]` hecho · `- [ ]` pendiente · `- [~]` opcional.

---

## ✅ Estado actual

### Arquitectura (misma que Casabella)
- [x] Astro 5 static + Tailwind 4 utility-first
- [x] Self-hosted fonts via `@fontsource-variable` (Bodoni Moda + Manrope) — GDPR-safe, sin Google Fonts
- [x] components/ chrome (Nav, MobileOverlay, Footer, WhatsAppFab, RevealScript, Eyebrow, CtaButton, Tag, LegalPage, RestaurantPage)
- [x] sections/ propias de Guixot (Hero, About, Manifesto, Dishes, Wines, Gallery, Groups, Faq, Booking, Map)
- [x] icons/ SVG inline (Hamburger, Close, ChevronDown, WhatsApp)
- [x] lib/ helpers (queries, jsonld, mapUtils, portableText, brand, schedule, whatsapp, typography)

### CMS + i18n
- [x] Sanity conectado (`RESTAURANT_SLUG=guixot`)
- [x] Idiomas ES + EN activos
- [x] Textos UI editables desde Sanity (4 tabs: nav, secciones, form, footer)

### SEO / GEO
- [x] JSON-LD Restaurant + FAQPage
- [x] sitemap.xml dinámico con hreflangs
- [x] robots.txt con crawlers AI
- [x] llms.txt dinámico
- [x] Meta OG + Twitter + canonical + hreflangs
- [x] `<html lang="es-ES">` regional
- [x] Preconnect a `cdn.sanity.io`
- [x] Skip navigation link (WCAG 2.4.1)

### Legal
- [x] Rutas `/legal/[slug]` + `/en/legal/[slug]` con LegalPage compartido
- [x] Enlaces en footer con hrefPrefix correcto

### Diseño y UX propio de Guixot
- [x] Hero horizontal (foto der + texto izq + footer con hours + reservar)
- [x] Split-at-last-word en H2 (última palabra en italic accent burgundy)
- [x] Menu sections con h3 + rule horizontal por categoría (look tavern)
- [x] Gallery grid asimétrico con posiciones específicas (1ra y 5ta span 2 rows)
- [x] Groups horizontal split (foto izq + contenido der + gradient overlay)
- [x] Booking form con inputs serif (Bodoni Moda) — más elegante que sans
- [x] Manifesto blockquote con comillas curvas literales
- [x] About body con drop-cap en el primer párrafo (letra capital burgundy)

### PWA
- [x] site.webmanifest dinámico
- [x] theme-color con `colorMarca` (`#c85a3b` → configurar en Sanity si se quiere burgundy)

### 404
- [x] Custom 404 con detección de locale en cliente

---

## 🔴 BLOQUEANTES

### Legal (RGPD + LSSI-CE)
- [x] Rutas legales técnicamente activas
- [ ] Cliente rellena `[COMPLETAR]` de CIF/NIF/titular en aviso, privacidad, cookies desde Sanity

### Analytics (Cloudflare Web Analytics)
- [x] Código integrado (BaseLayout carga script si `cloudflareAnalyticsToken` está definido)
- [ ] Cliente da de alta el sitio en dash.cloudflare.com → pega token en Sanity

### Reservas
- [ ] Endpoint Cloudflare Workers + Resend (compartir Resend Pro con todos los restaurantes → ~$4/mes por local)
- [ ] Env vars en Vercel: `RESEND_API_KEY`, `RESEND_FROM_EMAIL=reservas@guixot.cat`, `BOOKING_TO_EMAIL=hola@guixot.cat`

### Deploy Vercel
- [ ] Import repo → Root: `apps/guixot`, Build: `pnpm --filter guixot build`, Install: `cd ../.. && pnpm install --frozen-lockfile`
- [ ] Env vars: `SANITY_PROJECT_ID=yp5fwe5v`, `SANITY_DATASET=production`, `RESTAURANT_SLUG=guixot`
- [ ] Deploy hook + webhook Sanity con filter `slug.current == "guixot"`

### Dominio custom
- [ ] Comprar `guixot.cat` (o el que decida el cliente)
- [ ] Configurar DNS → Vercel
- [ ] Actualizar `astro.config.mjs` `site: 'https://guixot.cat'` + commit

---

## 🟠 CRÍTICOS

- [ ] Cliente sube fotos reales (hero, sobre, galería, hire) + logo + favicon + iconoApp
- [ ] Verificar `hola@guixot.cat` operativo
- [ ] Reclamar Google Business Profile — impacto SEO local mayor que la web misma

---

## 🟡 PERFORMANCE / NICE TO HAVE

- [ ] Auditoría Lighthouse post-deploy
- [ ] Rich Results Test (verificar JSON-LD Restaurant + FAQ)
- [ ] Google Search Console — indexar

---

_Última actualización: 2026-08-19_
