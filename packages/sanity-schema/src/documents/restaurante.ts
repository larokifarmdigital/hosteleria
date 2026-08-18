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
    { name: 'hero', title: '🦸 Hero' },
    { name: 'manifiesto', title: '💬 Manifiesto' },
    { name: 'sobre', title: '👥 Sobre nosotros' },
    { name: 'galeria', title: '🖼 Galería' },
    { name: 'grupos', title: '👨‍👩‍👧 Grupos y eventos' },
    { name: 'horarios', title: '🕐 Horarios' },
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
      name: 'colorMarca',
      title: 'Color accent de marca (hex)',
      type: 'string',
      group: 'identidad',
      description: 'Ej: #d2622a. Se usa como theme_color en PWA.',
      validation: r =>
        r.custom((value?: string) =>
          !value || /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)
            ? true
            : 'Debe ser un color hexadecimal válido (ej: #d2622a)'
        )
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

    // ── Hero ─────────────────────────────────────────────────────────
    defineField({
      name: 'heroTitulo',
      title: 'Título principal (H1)',
      type: i18nStr,
      group: 'hero',
      validation: r => validarTodosIdiomasOninguno(r)
    }),
    defineField({
      name: 'heroSubtitulo',
      title: 'Título superpuesto sobre la imagen (H2)',
      type: i18nStr,
      group: 'hero',
      validation: r => validarTodosIdiomasOninguno(r)
    }),
    defineField({
      name: 'heroMetaIzq',
      title: 'Meta izquierda',
      type: i18nStr,
      group: 'hero',
      description: 'Ej: "Restaurante en Plaça de la Llibertat."',
      validation: r => validarTodosIdiomasOninguno(r)
    }),
    defineField({
      name: 'heroMetaDer',
      title: 'Meta derecha',
      type: i18nStr,
      group: 'hero',
      description: 'Ej: "Barrio de Gràcia"',
      validation: r => validarTodosIdiomasOninguno(r)
    }),
    defineField({
      name: 'heroNota',
      title: 'Nota inferior sobre la imagen',
      type: i18nTxt,
      group: 'hero',
      validation: r => validarTodosIdiomasOninguno(r)
    }),
    defineField({
      name: 'heroCta',
      title: 'Texto del botón CTA',
      type: i18nStr,
      group: 'hero',
      description: 'Ej: "Reservar mesa"',
      validation: r => validarTodosIdiomasOninguno(r)
    }),
    defineField({
      name: 'heroImagen',
      title: 'Imagen del hero',
      type: 'image',
      group: 'hero',
      options: { hotspot: true },
      validation: r => r.required()
    }),

    // ── Manifiesto (statement) ───────────────────────────────────────
    defineField({
      name: 'manifiestoEyebrow',
      title: 'Eyebrow',
      type: i18nStr,
      group: 'manifiesto',
      validation: r => validarTodosIdiomasOninguno(r)
    }),
    defineField({
      name: 'manifiestoTexto',
      title: 'Frase manifiesto',
      type: i18nTxt,
      group: 'manifiesto',
      validation: r => validarTodosIdiomasOninguno(r)
    }),

    // ── Sobre nosotros ───────────────────────────────────────────────
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
      title: 'Cuerpo de la sección (texto enriquecido)',
      description:
        'Texto principal de "Sobre nosotros". Acepta varios párrafos y formato básico. Rellena en cada idioma activo (o deja vacío en todos).',
      type: 'internationalizedArrayPortableText',
      group: 'sobre',
      validation: r => validarTodosIdiomasOninguno(r)
    }),
    defineField({
      name: 'sobreImagenes',
      title: 'Imágenes (3 recomendadas)',
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
      validation: r => r.max(6)
    }),

    // ── Galería ──────────────────────────────────────────────────────
    defineField({
      name: 'galeria',
      title: 'Galería (carrusel del local)',
      type: 'array',
      group: 'galeria',
      description: '8 imágenes recomendadas.',
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
      ]
    }),

    // ── Grupos y eventos ─────────────────────────────────────────────
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
      name: 'gruposImagen',
      title: 'Imagen de fondo',
      type: 'image',
      group: 'grupos',
      options: { hotspot: true }
    }),

    // ── Horarios ─────────────────────────────────────────────────────
    defineField({
      name: 'horariosTitulo',
      title: 'Título de la sección',
      type: i18nStr,
      group: 'horarios',
      validation: r => validarTodosIdiomasOninguno(r)
    }),
    defineField({
      name: 'horariosTexto',
      title: 'Texto descriptivo de horarios',
      type: i18nTxt,
      group: 'horarios',
      validation: r => validarTodosIdiomasOninguno(r)
    }),
    defineField({
      name: 'horariosAbierto',
      title: 'Mensaje "estamos abiertos"',
      description:
        'Usa {hora} como placeholder para la hora de cierre. Ej: "Estamos abiertos hasta las {hora}."',
      type: i18nStr,
      group: 'horarios',
      validation: r => validarTodosIdiomasOninguno(r)
    }),
    defineField({
      name: 'horariosProximaApertura',
      title: 'Mensaje "hoy abrimos a las"',
      description: 'Usa {hora} como placeholder. Ej: "Hoy abrimos a las {hora}."',
      type: i18nStr,
      group: 'horarios',
      validation: r => validarTodosIdiomasOninguno(r)
    }),
    defineField({
      name: 'horariosCerrado',
      title: 'Mensaje "cerrado hoy"',
      type: i18nStr,
      group: 'horarios',
      validation: r => validarTodosIdiomasOninguno(r)
    }),
    defineField({
      name: 'horariosSemana',
      title: 'Horario semanal',
      description:
        'Un bloque por día. Cada día puede tener varios turnos (mañana, mediodía, noche). Si no añades turnos, ese día está cerrado.',
      type: 'array',
      group: 'horarios',
      of: [
        {
          type: 'object',
          name: 'diaHorario',
          fields: [
            {
              name: 'dia',
              title: 'Día',
              type: 'string',
              options: {
                list: [
                  { title: 'Lunes', value: 'Mo' },
                  { title: 'Martes', value: 'Tu' },
                  { title: 'Miércoles', value: 'We' },
                  { title: 'Jueves', value: 'Th' },
                  { title: 'Viernes', value: 'Fr' },
                  { title: 'Sábado', value: 'Sa' },
                  { title: 'Domingo', value: 'Su' }
                ]
              },
              validation: r => r.required()
            },
            {
              name: 'turnos',
              title: 'Turnos',
              description: 'Deja vacío si está cerrado.',
              type: 'array',
              of: [
                {
                  type: 'object',
                  name: 'turno',
                  fields: [
                    {
                      name: 'apertura',
                      title: 'Apertura (HH:MM)',
                      type: 'string',
                      validation: r => r.required().regex(/^([01]\d|2[0-3]):[0-5]\d$/)
                    },
                    {
                      name: 'cierre',
                      title: 'Cierre (HH:MM)',
                      description: 'Usa 24:00–27:59 si cierra pasada la medianoche.',
                      type: 'string',
                      validation: r => r.required().regex(/^(([01]\d|2[0-7]):[0-5]\d)$/)
                    }
                  ],
                  preview: {
                    select: { open: 'apertura', close: 'cierre' },
                    prepare: ({ open, close }) => ({ title: `${open} – ${close}` })
                  }
                }
              ]
            }
          ],
          preview: {
            select: { dia: 'dia', turnos: 'turnos' },
            prepare: ({ dia, turnos }) => {
              const DIAS: Record<string, string> = {
                Mo: 'Lunes',
                Tu: 'Martes',
                We: 'Miércoles',
                Th: 'Jueves',
                Fr: 'Viernes',
                Sa: 'Sábado',
                Su: 'Domingo'
              };
              const label = DIAS[dia] ?? dia;
              const summary = turnos?.length
                ? turnos
                    .map((t: { apertura: string; cierre: string }) => `${t.apertura}–${t.cierre}`)
                    .join(' · ')
                : 'Cerrado';
              return { title: label, subtitle: summary };
            }
          }
        }
      ]
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
      ],
    }),

    // ── 📝 Formulario de reserva ──────────────────────────────────────
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
      name: 'aceptaReservas',
      title: 'Acepta reservas',
      type: 'boolean',
      group: 'ia',
      initialValue: true
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
