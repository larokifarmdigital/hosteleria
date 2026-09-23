import { defineType, defineField } from 'sanity';
import { validarTodosIdiomasOninguno, validarLongitudPorIdioma } from '../lib/validacionI18n';

const i18nStr = 'internationalizedArrayString';
const i18nTxt = 'internationalizedArrayText';

export const restaurante = defineType({
  name: 'restaurante',
  title: 'Restaurante',
  type: 'document',
  groups: [
    { name: 'identidad', title: '🪪 Identidad', default: true },
    { name: 'espacios', title: '🏛 Espacios' },
    { name: 'bloquesHome', title: '🎴 Bloques destacados (home)' },
    { name: 'sobre', title: '👥 Sobre nosotros' },
    { name: 'grupos', title: '👨‍👩‍👧 Grupos y eventos' },
    { name: 'contacto', title: '📞 Contacto' },
    { name: 'redes', title: '📱 Redes sociales' },
    { name: 'textosNav', title: '🧭 Menú de navegación' },
    { name: 'textosSecciones', title: '🏷 Títulos de secciones' },
    { name: 'textosForm', title: '📝 Formulario de reserva' },
    { name: 'textosFooter', title: '🦶 Pie de página (textos)' },
    { name: 'seo', title: '🔍 SEO' },
    { name: 'ia', title: '🤖 IA · SEO avanzado' }
  ],
  fields: [
    // ── Identidad ────────────────────────────────────────────────────
    defineField({
      name: 'nombre',
      title: 'Nombre comercial',
      type: 'string',
      group: 'identidad',
      description: 'Nombre de marca. No se traduce.',
      validation: r => r.required()
    }),
    defineField({
      name: 'slug',
      title: 'Slug técnico',
      type: 'slug',
      group: 'identidad',
      description:
        'Identificador para URLs y para la variable RESTAURANT_SLUG del sitio Astro. No cambiar tras publicar.',
      options: { source: 'nombre', maxLength: 40 },
      validation: r => r.required()
    }),
    defineField({
      name: 'dominio',
      title: 'Dominio productivo',
      type: 'url',
      group: 'identidad',
      description: 'URL pública del sitio. Ej: https://lapubilla.com'
    }),
    defineField({
      name: 'anyoFundacion',
      title: 'Año de fundación',
      type: 'number',
      group: 'identidad',
      description:
        'Opcional. Si lo rellenas se muestra en el hero como "Est. {año}" junto al barrio (aire clasicista "casa con historia"). Si lo dejas vacío, no se muestra.',
      validation: r => r.min(1800).max(new Date().getFullYear()).integer().positive()
    }),
    defineField({
      name: 'logo',
      title: 'Logo del restaurante',
      type: 'image',
      group: 'identidad',
      description:
        'Se usa en Google y al compartir la web en redes. Formato .svg o .png con fondo transparente, mínimo 800×800 px.',
      options: { hotspot: true }
    }),
    defineField({
      name: 'favicon',
      title: 'Iconito de la pestaña del navegador',
      type: 'image',
      group: 'identidad',
      description:
        'Se ve muy pequeño (16×16 px) — usa un símbolo simple: inicial, monograma o el logo SIN texto. Cuadrado, .svg o .png ≥500×500.',
      options: { hotspot: false }
    }),
    defineField({
      name: 'iconoApp',
      title: 'Icono para pantalla de inicio del móvil',
      type: 'image',
      group: 'identidad',
      description:
        'Aparece si alguien guarda la web como app en el móvil (tipo icono de Instagram). Cuadrado, .png ≥500×500, CON color de fondo (nunca transparente), logo centrado con margen.',
      options: { hotspot: false }
    }),
    defineField({
      name: 'idiomaPorDefecto',
      title: 'Idioma por defecto',
      description:
        'Idioma que se sirve en la raíz (/) del sitio y que se usa como fallback si un contenido no está traducido.',
      type: 'reference',
      to: [{ type: 'idioma' }],
      group: 'identidad',
      validation: r => r.required()
    }),
    defineField({
      name: 'idiomasActivos',
      title: 'Idiomas activos en este restaurante',
      description:
        'De los idiomas del catálogo "🌐 Idiomas", marca los que quieres publicar en este restaurante. ' +
        'En cada campo traducible, la validación obliga a rellenar todos los idiomas listados aquí (o dejar el campo vacío en todos).',
      type: 'array',
      group: 'identidad',
      of: [{ type: 'reference', to: [{ type: 'idioma' }] }],
      validation: r =>
        r
          .required()
          .min(1)
          .unique()
          .custom(items => {
            if (!Array.isArray(items)) return true;
            const refs = (items as { _ref?: string }[])
              .map(i => i._ref)
              .filter(Boolean) as string[];
            const dup = refs.filter((c, idx) => refs.indexOf(c) !== idx);
            if (dup.length > 0) return 'No repitas el mismo idioma dos veces.';
            return true;
          })
    }),

    // ── Espacios ────────────────────────────────────────────────────
    defineField({
      name: 'espacios',
      title: 'Espacios de este restaurante',
      description:
        'Cada espacio es una experiencia (Restaurante, Café, Coctelería, Club, Terraza…). La mayoría de restaurantes tienen 1 solo espacio. Grupos multi-experiencia como Ocaña tienen varios. Se ordenan por el campo `orden` de cada espacio.',
      type: 'array',
      group: 'espacios',
      of: [{ type: 'reference', to: [{ type: 'espacio' }] }],
      validation: r => r.required().min(1).unique()
    }),

    // ── Bloques destacados del home ──────────────────────────────────
    // Opt-in por contenido: si el array está vacío, la sección del home no
    // se renderiza. Sirve tanto para grupos multi-espacio (Ocaña con "¿Qué es
    // Ocaña?", "Terraza", "Eventos y Grupos") como para restaurantes mono-
    // espacio que quieran añadir highlights sueltos en su landing.
    defineField({
      name: 'bloquesHome',
      title: 'Bloques destacados del home',
      description:
        'Cards cortas que aparecen en la home (después del grid de espacios). Cada bloque = título + texto corto + imagen opcional + botón opcional. Máx 6. Si está vacío, no se muestra la sección.',
      type: 'array',
      group: 'bloquesHome',
      of: [
        {
          type: 'object',
          name: 'bloqueDestacado',
          title: 'Bloque destacado',
          fields: [
            {
              name: 'titulo',
              title: 'Título',
              type: i18nStr,
              validation: (r) => validarTodosIdiomasOninguno(r),
            },
            {
              name: 'texto',
              title: 'Texto corto',
              description: '1–2 frases. Se muestra debajo del título.',
              type: i18nTxt,
              validation: (r) => validarTodosIdiomasOninguno(r),
            },
            {
              name: 'imagen',
              title: 'Imagen (opcional)',
              type: 'image',
              options: { hotspot: true },
            },
            {
              name: 'ctaTexto',
              title: 'Texto del botón (opcional)',
              description: 'Si no se rellena, la card no muestra botón.',
              type: i18nStr,
              validation: (r) => validarTodosIdiomasOninguno(r),
            },
            {
              name: 'ctaHref',
              title: 'URL del botón (opcional)',
              description: 'Puede ser URL absoluta (https://…) o relativa (/terrassa, #book, mailto:).',
              type: 'string',
            },
          ],
          preview: {
            select: {
              title: 'titulo.0.value',
              subtitle: 'texto.0.value',
              media: 'imagen',
            },
            prepare: ({ title, subtitle, media }) => ({
              title: title ?? '(Sin título)',
              subtitle: subtitle ?? '',
              media,
            }),
          },
        },
      ],
      validation: (r) => r.max(6),
    }),

    // ── Sobre nosotros (compartido por todos los espacios) ───────────
    // La historia del sitio es de la marca, no de cada espacio: en Ocaña
    // el mismo bloque aplica al Restaurant, Apotheke y Sala. En restaurantes
    // mono-espacio también vive aquí (más natural de editar).
    defineField({
      name: 'sobreEyebrow',
      title: 'Eyebrow',
      type: i18nStr,
      group: 'sobre',
      validation: r => validarTodosIdiomasOninguno(r)
    }),
    defineField({
      name: 'sobreTitulo',
      title: 'Título',
      type: i18nStr,
      group: 'sobre',
      validation: r => validarTodosIdiomasOninguno(r)
    }),
    defineField({
      name: 'sobreCuerpo',
      title: 'Cuerpo',
      description:
        'Texto principal de "Sobre nosotros". Acepta varios párrafos. Rellena en cada idioma activo (o deja vacío en todos).',
      type: 'internationalizedArrayPortableText',
      group: 'sobre',
      validation: r => validarTodosIdiomasOninguno(r)
    }),
    defineField({
      name: 'sobreImagenes',
      title: 'Imágenes (máx. 3)',
      description:
        'Hasta 3 imágenes. El diseño se adapta automáticamente al número: 1 grande junto al texto, 2 con panorámica de cierre, 3 con díptico bajo el texto.',
      type: 'array',
      group: 'sobre',
      of: [
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            {
              name: 'alt',
              title: 'Texto alternativo (alt)',
              type: i18nStr,
              validation: r => validarTodosIdiomasOninguno(r)
            }
          ]
        }
      ],
      validation: r => r.max(3)
    }),

    // ── Grupos y eventos (compartido) ────────────────────────────────
    // La política de reservado privado es de la marca, aplica a todos los
    // espacios. Los aforos/menús concretos por espacio se cuentan en el
    // copy — no hace falta desglose por espacio.
    defineField({
      name: 'gruposEyebrow',
      title: 'Eyebrow',
      type: i18nStr,
      group: 'grupos',
      validation: r => validarTodosIdiomasOninguno(r)
    }),
    defineField({
      name: 'gruposTitulo',
      title: 'Título',
      type: i18nStr,
      group: 'grupos',
      validation: r => validarTodosIdiomasOninguno(r)
    }),
    defineField({
      name: 'gruposCta',
      title: 'Texto del botón',
      type: i18nStr,
      group: 'grupos',
      validation: r => validarTodosIdiomasOninguno(r)
    }),
    defineField({
      name: 'gruposDestacados',
      title: 'Puntos destacados (lista)',
      description:
        'Lista de puntos clave del servicio de grupos (capacidad, tipo de menú, sala privada, etc.). Máx. 6.',
      type: 'array',
      group: 'grupos',
      of: [
        {
          type: 'object',
          name: 'puntoDestacado',
          fields: [
            {
              name: 'texto',
              title: 'Texto',
              type: i18nStr,
              validation: r => validarTodosIdiomasOninguno(r)
            }
          ],
          preview: {
            select: { title: 'texto.0.value' },
            prepare: ({ title }: { title?: string }) => ({ title: title || '(Sin texto)' })
          }
        }
      ],
      validation: r => r.max(6)
    }),
    defineField({
      name: 'gruposFeatures',
      title: 'Ventajas con icono (grid)',
      description:
        'Variante icónica de los puntos destacados. Cada ítem = icono + etiqueta corta uppercase + descripción. Se muestra como grid 2×2 en las apps que usen ese layout (ej. Casabella). Máx 6. Si está vacío, el .astro cae al layout de texto plano (gruposDestacados).',
      type: 'array',
      group: 'grupos',
      of: [
        {
          type: 'object',
          name: 'gruposFeature',
          title: 'Ventaja',
          fields: [
            {
              name: 'icon',
              title: 'Icono',
              type: 'string',
              options: {
                list: [
                  { title: '👥  Personas / aforo', value: 'users' },
                  { title: '👨‍🍳  Chef / menú', value: 'chef' },
                  { title: '🍷  Vino / bodega', value: 'wine' },
                  { title: '🕒  Reloj / horario', value: 'clock' },
                  { title: '📍  Ubicación / sala', value: 'pin' },
                  { title: '⭐  Celebración / especial', value: 'star' }
                ],
                layout: 'dropdown'
              },
              validation: (r: any) => r.required()
            },
            {
              name: 'label',
              title: 'Etiqueta (uppercase)',
              type: i18nStr,
              validation: (r: any) => validarTodosIdiomasOninguno(r)
            },
            {
              name: 'texto',
              title: 'Descripción corta',
              type: i18nTxt,
              validation: (r: any) => validarTodosIdiomasOninguno(r)
            }
          ],
          preview: {
            select: { icon: 'icon', title: 'label.0.value', subtitle: 'texto.0.value' },
            prepare: ({ icon, title, subtitle }: { icon?: string; title?: string; subtitle?: string }) => ({
              title: title || '(Sin etiqueta)',
              subtitle: icon ? `${icon} · ${subtitle ?? ''}` : subtitle
            })
          }
        }
      ],
      validation: r => r.max(6)
    }),
    defineField({
      name: 'gruposImagen',
      title: 'Imagen',
      type: 'image',
      group: 'grupos',
      options: { hotspot: true }
    }),

    // ── Contacto ─────────────────────────────────────────────────────
    defineField({
      name: 'direccion',
      title: 'Dirección',
      type: 'object',
      group: 'contacto',
      fields: [
        { name: 'calle', title: 'Calle y número', type: 'string' },
        { name: 'codigoPostal', title: 'Código postal', type: 'string' },
        { name: 'ciudad', title: 'Ciudad', type: 'string' },
        { name: 'provincia', title: 'Provincia', type: 'string' },
        { name: 'barrio', title: 'Barrio', type: 'string', description: 'Ej: Gràcia' },
        { name: 'pais', title: 'País (ISO 3166-1 alpha-2)', type: 'string', initialValue: 'ES' }
      ]
    }),
    defineField({
      name: 'contacto',
      title: 'Datos de contacto',
      type: 'object',
      group: 'contacto',
      fields: [
        { name: 'telefono', title: 'Teléfono', type: 'string' },
        { name: 'whatsapp', title: 'WhatsApp', type: 'string' },
        { name: 'email', title: 'Email', type: 'string', validation: r => r.email() },
        { name: 'web', title: 'Web', type: 'url' }
      ]
    }),
    defineField({
      name: 'mapaUrl',
      title: 'URL de Google Maps (iframe)',
      type: 'url',
      group: 'contacto',
      description: 'En Google Maps: Compartir → "Insertar un mapa" → copia el src del iframe.'
    }),

    // ── Redes sociales ───────────────────────────────────────────────
    defineField({
      name: 'mostrarRedes',
      title: 'Mostrar redes sociales en la web',
      description:
        'Si lo activas, los iconos/links a Instagram, Facebook, TikTok aparecerán en el footer del sitio y en JSON-LD para buscadores. Si lo dejas desactivado, los datos siguen guardados pero no se muestran en la web.',
      type: 'boolean',
      group: 'redes',
      initialValue: false
    }),
    defineField({
      name: 'redes',
      title: 'Enlaces a redes sociales',
      type: 'object',
      group: 'redes',
      fields: [
        { name: 'instagram', title: 'Instagram (URL)', type: 'url' },
        { name: 'facebook', title: 'Facebook (URL)', type: 'url' },
        { name: 'tiktok', title: 'TikTok (URL)', type: 'url' }
      ]
    }),
    defineField({
      name: 'mostrarResenas',
      title: 'Mostrar sección de reseñas en la web',
      description:
        'Si lo activas, la sección de reseñas del restaurante aparecerá en la web. Si lo dejas desactivado, las reseñas creadas siguen guardadas en el CMS pero no se muestran.',
      type: 'boolean',
      group: 'redes',
      initialValue: false
    }),

    // ── 🧭 Menú de navegación (textos) ────────────────────────────────
    defineField({
      name: 'textosNav',
      title: 'Textos del menú de navegación',
      type: 'object',
      group: 'textosNav',
      description: 'Enlaces del menú superior que llevan a cada sección de la landing.',
      fields: [
        {
          name: 'linkLocal',
          title: 'Enlace a sección Historia',
          description: 'Texto del enlace del menú que lleva a la sección "Sobre nosotros". Ejemplo: "HISTORIA".',
          type: i18nStr,
          validation: (r) => validarTodosIdiomasOninguno(r),
        },
        {
          name: 'linkCocina',
          title: 'Enlace a sección Carta / Platos',
          description: 'Texto del enlace del menú que lleva a la carta de platos. Ejemplo: "CARTA".',
          type: i18nStr,
          validation: (r) => validarTodosIdiomasOninguno(r),
        },
        {
          name: 'linkVinos',
          title: 'Enlace a sección Vinos',
          description: 'Texto del enlace del menú que lleva a la carta de vinos. Ejemplo: "VINOS".',
          type: i18nStr,
          validation: (r) => validarTodosIdiomasOninguno(r),
        },
        {
          name: 'linkGaleria',
          title: 'Enlace a sección Galería',
          description: 'Texto del enlace del menú que lleva a la galería de fotos. Ejemplo: "GALERÍA".',
          type: i18nStr,
          validation: (r) => validarTodosIdiomasOninguno(r),
        },
        {
          name: 'linkReservar',
          title: 'Botón "Reservar" (CTA dorado del menú)',
          description: 'Texto del botón dorado del menú que lleva al formulario de reserva. Ejemplo: "RESERVAR".',
          type: i18nStr,
          validation: (r) => validarTodosIdiomasOninguno(r),
        },
      ],
    }),

    // ── 🏷 Títulos de las secciones ───────────────────────────────────
    defineField({
      name: 'textosSecciones',
      title: 'Títulos y etiquetas de las secciones',
      type: 'object',
      group: 'textosSecciones',
      description: 'Títulos grandes y etiquetas pequeñas (eyebrows) que enmarcan cada sección de la landing.',
      fields: [
        {
          name: 'platosEyebrow',
          title: 'Etiqueta pequeña encima de "Platos"',
          description: 'Texto corto en dorado con espaciado grande, encima del título de la carta de platos. Ejemplo: "NUESTRA COCINA".',
          type: i18nStr,
          validation: (r) => validarTodosIdiomasOninguno(r),
        },
        {
          name: 'platosTitulo',
          title: 'Título grande de la sección Platos',
          description: 'Título grande en serif de la carta de platos. Ejemplo: "Carta de temporada".',
          type: i18nStr,
          validation: (r) => validarTodosIdiomasOninguno(r),
        },
        {
          name: 'vinosEyebrow',
          title: 'Etiqueta pequeña encima de "Vinos"',
          description: 'Texto corto en dorado con espaciado grande, encima del título de la carta de vinos. Ejemplo: "ESTA NOCHE, POR COPA".',
          type: i18nStr,
          validation: (r) => validarTodosIdiomasOninguno(r),
        },
        {
          name: 'vinosTitulo',
          title: 'Título grande de la sección Vinos',
          description: 'Título grande en serif de la carta de vinos. Ejemplo: "La carta breve".',
          type: i18nStr,
          validation: (r) => validarTodosIdiomasOninguno(r),
        },
        {
          name: 'vinosNotaFinal',
          title: 'Nota final debajo de la lista de vinos',
          description: 'Texto pequeño centrado que aparece al final de la carta de vinos. Ejemplo: "REFERENCIAS POR BOTELLA A CONSULTAR".',
          type: i18nStr,
          validation: (r) => validarTodosIdiomasOninguno(r),
        },
        {
          name: 'galeriaEyebrow',
          title: 'Etiqueta pequeña encima de "Galería"',
          description: 'Texto corto en dorado con espaciado grande, encima del título de la galería. Ejemplo: "EL LOCAL".',
          type: i18nStr,
          validation: (r) => validarTodosIdiomasOninguno(r),
        },
        {
          name: 'galeriaTitulo',
          title: 'Título grande de la sección Galería',
          description: 'Título grande en serif de la galería. Ejemplo: "Nuestro espacio".',
          type: i18nStr,
          validation: (r) => validarTodosIdiomasOninguno(r),
        },
        {
          name: 'bebidasEyebrow',
          title: 'Etiqueta pequeña encima de "Bebidas"',
          description: 'Ejemplo: "TRAS LA BARRA".',
          type: i18nStr,
          validation: (r) => validarTodosIdiomasOninguno(r),
        },
        {
          name: 'bebidasTitulo',
          title: 'Título grande de la sección Bebidas',
          description: 'Título grande en serif de la carta de bebidas. Ejemplo: "Para beber".',
          type: i18nStr,
          validation: (r) => validarTodosIdiomasOninguno(r),
        },
      ],
    }),

    // ── 📝 Formulario de reserva ──────────────────────────────────────
    defineField({
      name: 'aceptaReservas',
      title: 'Acepta reservas online',
      description:
        'Si está desactivado, el formulario de reserva no aparece en la landing y el botón "Reservar" cae en cascada: abre WhatsApp si hay número configurado, o llama al teléfono (con etiqueta "Llamar"), o se oculta si no hay ninguno.',
      type: 'boolean',
      group: 'textosForm',
      initialValue: true
    }),
    defineField({
      name: 'textosForm',
      title: 'Textos del formulario de reserva',
      type: 'object',
      group: 'textosForm',
      description: 'Título/intro encima del formulario, etiquetas de los 7 campos, botón de envío y mensaje al enviar.',
      fields: [
        {
          name: 'titulo',
          title: 'Título del formulario',
          description: 'Título grande en serif encima del formulario. Ejemplo: "Reserva tu mesa".',
          type: i18nStr,
          validation: (r) => validarTodosIdiomasOninguno(r),
        },
        {
          name: 'intro',
          title: 'Texto introductorio del formulario',
          description: 'Párrafo corto debajo del título, invitando a reservar. Ejemplo: "Rellena el formulario y te confirmamos en menos de 24 h.".',
          type: i18nTxt,
          validation: (r) => validarTodosIdiomasOninguno(r),
        },
        {
          name: 'labelNombre',
          title: 'Etiqueta del campo "Nombre"',
          description: 'Ejemplo: "NOMBRE".',
          type: i18nStr,
          validation: (r) => validarTodosIdiomasOninguno(r),
        },
        {
          name: 'labelTelefono',
          title: 'Etiqueta del campo "Teléfono"',
          description: 'Ejemplo: "TELÉFONO".',
          type: i18nStr,
          validation: (r) => validarTodosIdiomasOninguno(r),
        },
        {
          name: 'labelEmail',
          title: 'Etiqueta del campo "Email"',
          description: 'Ejemplo: "EMAIL".',
          type: i18nStr,
          validation: (r) => validarTodosIdiomasOninguno(r),
        },
        {
          name: 'labelComensales',
          title: 'Etiqueta del campo "Comensales"',
          description: 'Ejemplo: "COMENSALES".',
          type: i18nStr,
          validation: (r) => validarTodosIdiomasOninguno(r),
        },
        {
          name: 'labelFecha',
          title: 'Etiqueta del campo "Fecha"',
          description: 'Ejemplo: "FECHA".',
          type: i18nStr,
          validation: (r) => validarTodosIdiomasOninguno(r),
        },
        {
          name: 'labelHora',
          title: 'Etiqueta del campo "Hora"',
          description: 'Ejemplo: "HORA".',
          type: i18nStr,
          validation: (r) => validarTodosIdiomasOninguno(r),
        },
        {
          name: 'labelNotas',
          title: 'Etiqueta del campo "Notas"',
          description: 'Ejemplo: "NOTAS".',
          type: i18nStr,
          validation: (r) => validarTodosIdiomasOninguno(r),
        },
        {
          name: 'submit',
          title: 'Botón para enviar la reserva',
          description: 'Texto del botón dorado que envía el formulario. Ejemplo: "ENVIAR RESERVA".',
          type: i18nStr,
          validation: (r) => validarTodosIdiomasOninguno(r),
        },
        {
          name: 'exito',
          title: 'Mensaje de confirmación al enviar',
          description: 'Texto corto que aparece debajo del botón cuando se ha enviado el formulario. Ejemplo: "Gracias, te contactamos en breve.".',
          type: i18nStr,
          validation: (r) => validarTodosIdiomasOninguno(r),
        },
      ],
    }),

    // ── 🦶 Pie de página (textos) ─────────────────────────────────────
    defineField({
      name: 'textosFooter',
      title: 'Textos del pie de página',
      type: 'object',
      group: 'textosFooter',
      description: 'Título de la columna "Contacto" y frase editorial de firma que aparece debajo del CTA "Reservar" del pie.',
      fields: [
        {
          name: 'colContacto',
          title: 'Título de la columna "Contacto"',
          description: 'Cabecera de la columna del pie donde salen teléfono, WhatsApp y email. Ejemplo: "CONTACTO".',
          type: i18nStr,
          validation: (r) => validarTodosIdiomasOninguno(r),
        },
        {
          name: 'bylineIzq',
          title: 'Frase editorial de firma',
          description: 'Frase corta descriptiva que aparece en el pie, debajo del "¿Con ganas de mesa?". Ejemplo: "Cocina de mercado en Barcelona".',
          type: i18nStr,
          validation: (r) => validarTodosIdiomasOninguno(r),
        },
      ],
    }),

    // ── SEO ──────────────────────────────────────────────────────────
    defineField({
      name: 'seoTitulo',
      title: 'Title (SEO)',
      type: i18nStr,
      group: 'seo',
      description: 'Si se deja vacío se usa "Nombre · Ciudad". Máx. 70 caracteres por idioma.',
      validation: r => [validarTodosIdiomasOninguno(r), validarLongitudPorIdioma(70)(r)]
    }),
    defineField({
      name: 'seoDescripcion',
      title: 'Meta description (SEO)',
      type: i18nTxt,
      group: 'seo',
      description: 'Máx. 180 caracteres por idioma.',
      validation: r => [validarTodosIdiomasOninguno(r), validarLongitudPorIdioma(180)(r)]
    }),
    defineField({
      name: 'seoImagen',
      title: 'Imagen Open Graph',
      type: 'image',
      group: 'seo',
      description:
        'Imagen al compartir en WhatsApp, Facebook, etc. 1200×630 px, JPG/PNG, < 1 MB. Compartida entre idiomas.',
      options: { hotspot: true }
    }),

    // ── IA · SEO avanzado ────────────────────────────────────────────
    defineField({
      name: 'resumenIA',
      title: 'Resumen para buscadores IA',
      description:
        'Un párrafo natural que resume qué es el restaurante (como si respondieras a "¿qué es este sitio?"). Se usa en el archivo /llms.txt que leen ChatGPT, Perplexity, Google AI Overviews, y para enriquecer el JSON-LD. Cuanto más concreto (barrio, cocina, precio, especialidad), mejor te citarán.',
      type: 'internationalizedArrayText',
      group: 'ia',
      validation: r => validarTodosIdiomasOninguno(r)
    }),
    defineField({
      name: 'cloudflareAnalyticsToken',
      title: 'Token de Cloudflare Web Analytics',
      description:
        'Si has dado de alta el sitio en Cloudflare Web Analytics (dash.cloudflare.com → Analytics & Logs → Web Analytics), pega aquí el token (parece un hash largo, ej: 1a2b3c4d5e6f...). Se cargará el beacon de tracking automáticamente. Si dejas vacío, no se carga analytics. Es gratis y no usa cookies.',
      type: 'string',
      group: 'ia'
    }),
    defineField({
      name: 'precioMedio',
      title: 'Precio medio por persona (€)',
      description:
        'Aproximado con dos platos y bebida. Se usa en el JSON-LD que leen los buscadores para "precio típico".',
      type: 'number',
      group: 'ia',
      validation: r => r.min(0).max(500)
    }),
    defineField({
      name: 'formasPago',
      title: 'Formas de pago aceptadas',
      type: 'array',
      group: 'ia',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'Efectivo', value: 'cash' },
          { title: 'Tarjeta de crédito', value: 'credit_card' },
          { title: 'Tarjeta de débito', value: 'debit_card' },
          { title: 'Contactless', value: 'contactless' },
          { title: 'Apple Pay', value: 'apple_pay' },
          { title: 'Google Pay', value: 'google_pay' },
          { title: 'Bizum', value: 'bizum' }
        ]
      }
    }),
    defineField({
      name: 'serviciosExtras',
      title: 'Servicios y características',
      description:
        'Marca las que aplican a tu restaurante. Se usan en el JSON-LD y en el /llms.txt para que los buscadores IA sepan qué ofreces.',
      type: 'array',
      group: 'ia',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'Terraza', value: 'terraza' },
          { title: 'Grupos y eventos', value: 'grupos' },
          { title: 'Sala privada / reservado', value: 'sala_privada' },
          { title: 'Opciones vegetarianas', value: 'vegetariano' },
          { title: 'Opciones veganas', value: 'vegano' },
          { title: 'Opciones sin gluten', value: 'sin_gluten' },
          { title: 'Menú del día', value: 'menu_dia' },
          { title: 'Menú degustación', value: 'menu_degustacion' },
          { title: 'Carta de vinos amplia', value: 'carta_vinos' },
          { title: 'Bar / vermuteo', value: 'bar' },
          { title: 'Familiar / niños', value: 'familiar' },
          { title: 'Pet friendly', value: 'pet_friendly' },
          { title: 'Accesible en silla de ruedas', value: 'accesible' },
          { title: 'Aparcamiento cercano', value: 'aparcamiento' }
        ]
      }
    }),
    defineField({
      name: 'faqEyebrow',
      title: 'FAQ · Eyebrow',
      description: 'Etiqueta superior del bloque FAQ. Ej: "Preguntas frecuentes".',
      type: i18nStr,
      group: 'ia',
      validation: r => validarTodosIdiomasOninguno(r)
    }),
    defineField({
      name: 'faqTitulo',
      title: 'FAQ · Título',
      description: 'Título grande del bloque FAQ. Ej: "Todo lo que".',
      type: i18nStr,
      group: 'ia',
      validation: r => validarTodosIdiomasOninguno(r)
    }),
    defineField({
      name: 'faqTituloAcento',
      title: 'FAQ · Título (acento italic)',
      description:
        'Continuación del título en italic burdeos. Ej: "necesitas saber". Opcional — si lo dejas vacío se muestra solo el título principal.',
      type: i18nStr,
      group: 'ia',
      validation: r => validarTodosIdiomasOninguno(r)
    }),
    defineField({
      name: 'faq',
      title: 'Preguntas frecuentes',
      description:
        'Preguntas y respuestas que aparecen en la web y ayudan a que los buscadores IA (ChatGPT, Perplexity, Google AI Overviews, Gemini) citen tu restaurante cuando alguien pregunta "restaurantes de cocina X en Y". Recomendado: 6-10 preguntas concretas, respuestas de 50-150 palabras en lenguaje natural.',
      type: 'array',
      group: 'ia',
      of: [
        {
          type: 'object',
          name: 'faqItem',
          fields: [
            {
              name: 'pregunta',
              title: 'Pregunta',
              type: i18nStr,
              validation: r => validarTodosIdiomasOninguno(r)
            },
            {
              name: 'respuesta',
              title: 'Respuesta',
              type: i18nTxt,
              validation: r => validarTodosIdiomasOninguno(r)
            }
          ],
          preview: {
            select: { title: 'pregunta.0.value' },
            prepare: ({ title }: { title?: string }) => ({ title: title || '(Sin pregunta)' })
          }
        }
      ]
    })
  ],
  preview: {
    select: { title: 'nombre', subtitle: 'direccion.ciudad' }
  }
});
