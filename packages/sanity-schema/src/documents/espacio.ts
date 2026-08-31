import { defineType, defineField } from 'sanity';
import { validarTodosIdiomasOninguno } from '../lib/validacionI18n';

const i18nStr = 'internationalizedArrayString';
const i18nTxt = 'internationalizedArrayText';

/**
 * Espacio — una "experiencia" dentro de un restaurante/grupo.
 *
 * La mayoría de restaurantes tienen 1 solo espacio (el propio restaurante).
 * Grupos multi-experiencia (ej. Ocaña) tienen varios: café, coctelería, club,
 * restaurant, cada uno con su hero, carta, horarios propios, etc.
 *
 * Los campos "globales" (contacto, redes, footer, SEO, textos UI, legales)
 * viven en el doc `restaurante` porque se comparten entre espacios.
 * Los campos "de experiencia" (hero, manifesto, sobre nosotros, galería,
 * grupos, horarios, dirección propia opcional) viven aquí.
 */
export const espacio = defineType({
  name: 'espacio',
  title: 'Espacio',
  type: 'document',
  groups: [
    { name: 'identidad', title: '🪪 Identidad', default: true },
    { name: 'hero', title: '🦸 Hero' },
    { name: 'manifiesto', title: '💬 Manifiesto' },
    { name: 'galeria', title: '🖼 Galería' },
    { name: 'horarios', title: '🕐 Horarios' },
    { name: 'contacto', title: '📞 Contacto (opcional)' }
  ],
  fields: [
    // ── Identidad ────────────────────────────────────────────────────
    defineField({
      name: 'restaurante',
      title: 'Restaurante al que pertenece',
      type: 'reference',
      to: [{ type: 'restaurante' }],
      group: 'identidad',
      validation: r => r.required(),
      description:
        'El restaurante padre del que forma parte este espacio. Los campos globales (contacto principal, redes, SEO, footer) viven en el restaurante.'
    }),
    defineField({
      name: 'nombre',
      title: 'Nombre del espacio',
      description: 'Ej: "Café", "Apotheke", "Club", "Restaurant", "Terraza".',
      type: 'string',
      group: 'identidad',
      validation: r => r.required()
    }),
    defineField({
      name: 'slug',
      title: 'Slug (URL)',
      description: 'Se usa para la URL del espacio (ej: /cafe, /apotheke, /club).',
      type: 'slug',
      group: 'identidad',
      options: { source: 'nombre', maxLength: 40 },
      validation: r => r.required()
    }),
    defineField({
      name: 'tipo',
      title: 'Tipo de espacio',
      description:
        'Clasificación semántica. Ayuda al SEO/JSON-LD y a decidir qué layout aplicar (una cafetería no se ve igual que un club nocturno).',
      type: 'string',
      group: 'identidad',
      options: {
        list: [
          { title: '🍽 Restaurante', value: 'restaurant' },
          { title: '☕ Café / cafetería', value: 'cafe' },
          { title: '🍸 Coctelería / bar', value: 'coctel' },
          { title: '💃 Club / discoteca', value: 'club' },
          { title: '🌿 Terraza', value: 'terraza' },
          { title: '🎶 Live music / sala de conciertos', value: 'live_music' },
          { title: '📚 Otro', value: 'otro' }
        ]
      },
      initialValue: 'restaurant',
      validation: r => r.required()
    }),
    defineField({
      name: 'orden',
      title: 'Orden de aparición',
      description:
        'Menor primero. Ej: 10, 20, 30… Se usa para ordenar los espacios en la landing multi-espacio.',
      type: 'number',
      group: 'identidad',
      initialValue: 10
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
      title: 'Subtítulo (H2)',
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
      title: 'Nota inferior',
      type: i18nTxt,
      group: 'hero',
      validation: r => validarTodosIdiomasOninguno(r)
    }),
    defineField({
      name: 'heroCta',
      title: 'Texto del botón CTA',
      type: i18nStr,
      group: 'hero',
      validation: r => validarTodosIdiomasOninguno(r)
    }),
    defineField({
      name: 'heroImagen',
      title: 'Imagen del hero',
      type: 'image',
      group: 'hero',
      options: { hotspot: true }
    }),

    // ── Manifiesto ───────────────────────────────────────────────────
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

    // ── Galería ──────────────────────────────────────────────────────
    defineField({
      name: 'galeria',
      title: 'Galería',
      type: 'array',
      group: 'galeria',
      of: [{ type: 'image', options: { hotspot: true } }]
    }),

    // ── Horarios ─────────────────────────────────────────────────────
    defineField({
      name: 'horariosTitulo',
      title: 'Título',
      type: i18nStr,
      group: 'horarios',
      validation: r => validarTodosIdiomasOninguno(r)
    }),
    defineField({
      name: 'horariosTexto',
      title: 'Texto descriptivo',
      type: i18nTxt,
      group: 'horarios',
      validation: r => validarTodosIdiomasOninguno(r)
    }),
    defineField({
      name: 'horariosAbierto',
      title: 'Mensaje "Abierto hasta las {hora}"',
      type: i18nStr,
      group: 'horarios',
      description: 'Usa {hora} como placeholder para la hora de cierre.',
      validation: r => validarTodosIdiomasOninguno(r)
    }),
    defineField({
      name: 'horariosProximaApertura',
      title: 'Mensaje "Hoy abrimos a las {hora}"',
      type: i18nStr,
      group: 'horarios',
      validation: r => validarTodosIdiomasOninguno(r)
    }),
    defineField({
      name: 'horariosCerrado',
      title: 'Mensaje cuando está cerrado',
      type: i18nStr,
      group: 'horarios',
      validation: r => validarTodosIdiomasOninguno(r)
    }),
    defineField({
      name: 'horariosSemana',
      title: 'Horario semanal',
      description: 'Marca los turnos de cada día. Días vacíos = cerrado.',
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
              type: 'array',
              of: [
                {
                  type: 'object',
                  name: 'turno',
                  fields: [
                    { name: 'apertura', title: 'Apertura', type: 'string' },
                    { name: 'cierre', title: 'Cierre', type: 'string' }
                  ],
                  preview: {
                    select: { apertura: 'apertura', cierre: 'cierre' },
                    prepare: ({ apertura, cierre }: { apertura?: string; cierre?: string }) => ({
                      title: `${apertura ?? '?'}–${cierre ?? '?'}`
                    })
                  }
                }
              ]
            }
          ],
          preview: {
            select: { title: 'dia', turnos: 'turnos' },
            prepare: ({ title, turnos }: { title?: string; turnos?: unknown[] }) => ({
              title: title ?? '?',
              subtitle: turnos?.length ? `${turnos.length} turno(s)` : 'Cerrado'
            })
          }
        }
      ]
    }),

    // ── Contacto propio (opcional) ───────────────────────────────────
    defineField({
      name: 'direccion',
      title: 'Dirección propia (opcional)',
      description:
        'Solo si este espacio tiene una dirección distinta del restaurante principal. Si se deja vacío, se usa la del restaurante.',
      type: 'object',
      group: 'contacto',
      fields: [
        { name: 'calle', title: 'Calle', type: 'string' },
        { name: 'codigoPostal', title: 'Código postal', type: 'string' },
        { name: 'ciudad', title: 'Ciudad', type: 'string' },
        { name: 'provincia', title: 'Provincia', type: 'string' },
        { name: 'barrio', title: 'Barrio', type: 'string' },
        { name: 'pais', title: 'País (ISO)', type: 'string' }
      ]
    }),
    defineField({
      name: 'mapaUrl',
      title: 'URL o iframe de Google Maps (opcional)',
      description: 'Solo si tiene un mapa distinto del restaurante principal.',
      type: 'text',
      group: 'contacto',
      rows: 3
    }),
    defineField({
      name: 'contactoReserva',
      title: 'Contacto de reserva propio (opcional)',
      description:
        'Solo si este espacio recibe reservas por un canal distinto (ej. WhatsApp separado). Si se deja vacío, se usa el contacto del restaurante.',
      type: 'object',
      group: 'contacto',
      fields: [
        { name: 'telefono', title: 'Teléfono', type: 'string' },
        { name: 'whatsapp', title: 'WhatsApp', type: 'string' },
        { name: 'email', title: 'Email', type: 'string' }
      ]
    })
  ],
  preview: {
    select: {
      title: 'nombre',
      subtitle: 'tipo',
      restaurante: 'restaurante.nombre',
      media: 'heroImagen'
    },
    prepare: ({ title, subtitle, restaurante, media }) => ({
      title: title ?? '(Sin nombre)',
      subtitle: [restaurante, subtitle].filter(Boolean).join(' · '),
      media
    })
  }
});
