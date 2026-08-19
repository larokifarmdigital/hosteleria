/**
 * Script de seed: borra todo el contenido de la dataset y lo repuebla con:
 *  - 2 idiomas (es, en)
 *  - 2 restaurantes (La Pubilla + La Principal) con datos mock
 *  - Sus categorías + vinos + platos (mocks distintos para cada uno)
 *
 * Ejecutar:
 *   pnpm --filter studio run seed
 *
 * NOTA: las imágenes se dejan sin subir — el cliente las carga desde el Studio.
 */
import { getCliClient } from 'sanity/cli';

const client = getCliClient();

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

type I18nEntry = { _key: string; _type: string; value: unknown };

function i18nStr(es: string, en: string): I18nEntry[] {
  return [
    { _key: 'es', _type: 'internationalizedArrayStringValue', value: es },
    { _key: 'en', _type: 'internationalizedArrayStringValue', value: en }
  ];
}

function i18nTxt(es: string, en: string): I18nEntry[] {
  return [
    { _key: 'es', _type: 'internationalizedArrayTextValue', value: es },
    { _key: 'en', _type: 'internationalizedArrayTextValue', value: en }
  ];
}

function parrafo(text: string, keyBase: string) {
  return bloque(text, keyBase, 'normal');
}

function bloque(text: string, keyBase: string, style = 'normal') {
  return {
    _type: 'block',
    _key: `b${keyBase}`,
    style,
    markDefs: [],
    children: [{ _type: 'span', _key: `s${keyBase}`, text, marks: [] }]
  };
}

/** Construye contenido rich text a partir de tuplas [style, text]. */
function contenidoLegal(items: Array<[string, string]>, prefix: string) {
  return items.map(([style, text], i) => bloque(text, `${prefix}${i}`, style));
}

/** Envuelve dos arrays de portable text (es, en) en formato i18n del plugin. */
function i18nPortable(esBloques: unknown[], enBloques: unknown[]): I18nEntry[] {
  return [
    { _key: 'es', _type: 'internationalizedArrayPortableTextValue', value: esBloques },
    { _key: 'en', _type: 'internationalizedArrayPortableTextValue', value: enBloques }
  ];
}

function i18nRich(esArr: string[], enArr: string[]): I18nEntry[] {
  return [
    {
      _key: 'es',
      _type: 'internationalizedArrayPortableTextValue',
      value: esArr.map((t, i) => parrafo(t, `es${i}`))
    },
    {
      _key: 'en',
      _type: 'internationalizedArrayPortableTextValue',
      value: enArr.map((t, i) => parrafo(t, `en${i}`))
    }
  ];
}

function ref(id: string) {
  return { _type: 'reference', _ref: id };
}

/**
 * Textos de UI compartidos entre restaurantes (mismo copy genérico para nav,
 * form de reserva y footer). El cliente los puede personalizar por restaurante
 * desde el Studio después.
 */
function crearTextosUiMock(email: string, telefono: string) {
  return {
    textosNav: {
      linkLocal: i18nStr('Historia', 'About'),
      linkCocina: i18nStr('Carta', 'Menu'),
      linkVinos: i18nStr('Vinos', 'Wines'),
      linkGaleria: i18nStr('Galería', 'Gallery'),
      linkReservar: i18nStr('Reservar', 'Book')
    },
    textosSecciones: {
      platosEyebrow: i18nStr('De la cocina', 'From the kitchen'),
      platosTitulo: i18nStr('Para compartir', 'To share'),
      vinosEyebrow: i18nStr('Esta noche, por copa', 'Tonight, by the glass'),
      vinosTitulo: i18nStr('La carta breve', 'The short list'),
      vinosNotaFinal: i18nStr(
        'La carta de botellas es más larga, pregúntanos',
        'The bottle list runs longer, ask us'
      ),
      galeriaEyebrow: i18nStr('El local', 'The room'),
      galeriaTitulo: i18nStr('Nuestro espacio', 'Our space')
    },
    textosForm: {
      titulo: i18nStr('Guárdanos una mesa', 'Save us a table'),
      intro: i18nTxt(
        `Rellena el formulario y te confirmamos por email. Si prefieres, puedes llamarnos al ${telefono} o escribirnos a ${email}.`,
        `Fill in the form and we'll confirm by email. Or call us on ${telefono}, or write to ${email}.`
      ),
      labelNombre: i18nStr('Nombre', 'Name'),
      labelTelefono: i18nStr('Teléfono', 'Phone'),
      labelEmail: i18nStr('Email', 'Email'),
      labelComensales: i18nStr('Comensales', 'Guests'),
      labelFecha: i18nStr('Fecha', 'Date'),
      labelHora: i18nStr('Hora', 'Time'),
      labelNotas: i18nStr(
        'Notas (alergias, celebración, etc.)',
        'Notes (allergies, celebration, etc.)'
      ),
      submit: i18nStr('Enviar reserva', 'Send booking'),
      exito: i18nStr(
        'Abriendo tu cliente de correo para enviar la reserva…',
        'Opening your email client to send the booking…'
      )
    },
    textosFooter: {
      colContacto: i18nStr('Contacto', 'Contact'),
      bylineIzq: i18nStr('Cocina de mercado en Barcelona', 'Market cuisine in Barcelona')
    }
  };
}

const TIPOS = [
  'idioma',
  'restaurante',
  'categoriaVino',
  'vino',
  'categoriaPlato',
  'plato',
  'resena',
  'paginaLegal'
];

// ─────────────────────────────────────────────────────────────────────────────
// IDs
// ─────────────────────────────────────────────────────────────────────────────

const ID = {
  idiomaEs: 'idioma-es',
  idiomaEn: 'idioma-en',
  // Pubilla
  restaurantePubilla: 'restaurante-pubilla',
  catVinoPubilla: {
    blancos: 'catVino-pubilla-blancos',
    tintos: 'catVino-pubilla-tintos',
    espumosos: 'catVino-pubilla-espumosos'
  },
  catPlatoPubilla: {
    paraPicar: 'catPlato-pubilla-para-picar',
    frios: 'catPlato-pubilla-frios',
    deCocina: 'catPlato-pubilla-de-cocina',
    dulces: 'catPlato-pubilla-dulces'
  },
  // La Principal
  restaurantePrincipal: 'restaurante-la-principal',
  catVinoPrincipal: {
    blancos: 'catVino-principal-blancos',
    tintos: 'catVino-principal-tintos',
    espumosos: 'catVino-principal-espumosos'
  },
  catPlatoPrincipal: {
    entrantes: 'catPlato-principal-entrantes',
    principales: 'catPlato-principal-principales',
    postres: 'catPlato-principal-postres'
  },
  // Casabella
  restauranteCasabella: 'restaurante-casabella',
  catVinoCasabella: {
    blancos: 'catVino-casabella-blancos',
    tintos: 'catVino-casabella-tintos',
    burbujas: 'catVino-casabella-burbujas'
  },
  catPlatoCasabella: {
    entrantes: 'catPlato-casabella-entrantes',
    principales: 'catPlato-casabella-principales',
    postres: 'catPlato-casabella-postres'
  },
  // Guixot
  restauranteGuixot: 'restaurante-guixot',
  catVinoGuixot: {
    blancos: 'catVino-guixot-blancos',
    tintos: 'catVino-guixot-tintos',
    rosados: 'catVino-guixot-rosados'
  },
  catPlatoGuixot: {
    entrantes: 'catPlato-guixot-entrantes',
    guisos: 'catPlato-guixot-guisos',
    postres: 'catPlato-guixot-postres'
  },
  // Roure
  restauranteRoure: 'restaurante-roure',
  catVinoRoure: {
    naturales: 'catVino-roure-naturales',
    blancos: 'catVino-roure-blancos',
    tintos: 'catVino-roure-tintos'
  },
  catPlatoRoure: {
    empezar: 'catPlato-roure-empezar',
    principales: 'catPlato-roure-principales',
    postres: 'catPlato-roure-postres'
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// LA PUBILLA
// ─────────────────────────────────────────────────────────────────────────────

const HORARIOS_PUBILLA_LU = [
  { _key: 't1', _type: 'turno', apertura: '08:30', cierre: '12:00' },
  { _key: 't2', _type: 'turno', apertura: '13:15', cierre: '16:00' }
];
const HORARIOS_PUBILLA_MA_SA = [
  ...HORARIOS_PUBILLA_LU,
  { _key: 't3', _type: 'turno', apertura: '20:00', cierre: '23:30' }
];

const restaurantePubilla = {
  _id: ID.restaurantePubilla,
  _type: 'restaurante',
  nombre: 'La Pubilla',
  slug: { _type: 'slug', current: 'pubilla' },
  dominio: 'https://lapubilla.com',
  colorMarca: '#d2622a',
  idiomaPorDefecto: ref(ID.idiomaEs),
  idiomasActivos: [
    { _key: 'la-es', ...ref(ID.idiomaEs) },
    { _key: 'la-en', ...ref(ID.idiomaEn) }
  ],
  heroTitulo: i18nStr('Cocina de mercado', 'Market cuisine'),
  heroSubtitulo: i18nStr('Casa centenaria', 'Century-old house'),
  heroMetaIzq: i18nStr(
    'Restaurante en Plaça de la Llibertat.',
    'Restaurant on Plaça de la Llibertat.'
  ),
  heroMetaDer: i18nStr('Barrio de Gràcia', 'Gràcia district'),
  heroNota: i18nTxt(
    'Cocina abierta de martes a sábado.\nDesayunos, comidas y cenas.',
    'Kitchen open Tuesday to Saturday.\nBreakfasts, lunches and dinners.'
  ),
  heroCta: i18nStr('Reservar mesa', 'Book a table'),
  manifiestoEyebrow: i18nStr(
    'La Pubilla, en Gràcia desde hace un siglo',
    'La Pubilla, in Gràcia for a century'
  ),
  manifiestoTexto: i18nTxt(
    'Producto de mercado, recetas de siempre y sobremesas que se alargan sin prisa.',
    'Market produce, timeless recipes, and long unhurried after-meals.'
  ),
  sobreEyebrow: i18nStr('Nuestra historia', 'Our story'),
  sobreTitulo: i18nStr('Un siglo en Gràcia', 'A century in Gràcia'),
  sobreCuerpo: i18nRich(
    [
      'La Pubilla lleva casi cien años en la Plaça de la Llibertat, con una idea sencilla: que un restaurante de barrio debe sentirse como la casa de un amigo, no como un templo. La cocina evoluciona, el barrio también, pero el rato en la mesa no.',
      'Trabajamos con producto de mercado y proximidad. La carta cambia con la temporada y las recetas se apoyan siempre en lo mismo: caldos largos, buen fuego y ganas de dar de comer.'
    ],
    [
      "La Pubilla has been on Plaça de la Llibertat for nearly a hundred years, with a simple idea: a neighbourhood restaurant should feel like a friend's home, not a temple. The kitchen evolves, the neighbourhood too, but the time at the table doesn't.",
      'We work with market and local produce. The menu changes with the season and the recipes always come back to the same: long stocks, good fire, and the desire to feed people.'
    ]
  ),
  gruposEyebrow: i18nStr('Grupos y eventos', 'Groups & events'),
  gruposTitulo: i18nStr('Reservados y celebraciones', 'Private hire & celebrations'),
  gruposCta: i18nStr('Consultar', 'Enquire'),
  horariosTitulo: i18nStr('Ven a conocernos', 'Come visit us'),
  horariosTexto: i18nTxt(
    'Desayunos y comidas de lunes a sábado, 8:30–12:00 y 13:15–16:00. Cenas de martes a sábado, 20:00–23:30. Domingos, cerrado.',
    'Breakfasts and lunches Monday to Saturday, 8:30–12:00 and 13:15–16:00. Dinners Tuesday to Saturday, 20:00–23:30. Sundays, closed.'
  ),
  horariosAbierto: i18nStr('Estamos abiertos hasta las {hora}.', 'Open now until {hora}.'),
  horariosProximaApertura: i18nStr('Hoy abrimos a las {hora}.', 'Opens today at {hora}.'),
  horariosCerrado: i18nStr('Hoy no abrimos. Nos vemos mañana.', 'Closed today. See you tomorrow.'),
  horariosSemana: [
    { _key: 'd1', _type: 'diaHorario', dia: 'Mo', turnos: HORARIOS_PUBILLA_LU },
    { _key: 'd2', _type: 'diaHorario', dia: 'Tu', turnos: HORARIOS_PUBILLA_MA_SA },
    { _key: 'd3', _type: 'diaHorario', dia: 'We', turnos: HORARIOS_PUBILLA_MA_SA },
    { _key: 'd4', _type: 'diaHorario', dia: 'Th', turnos: HORARIOS_PUBILLA_MA_SA },
    { _key: 'd5', _type: 'diaHorario', dia: 'Fr', turnos: HORARIOS_PUBILLA_MA_SA },
    { _key: 'd6', _type: 'diaHorario', dia: 'Sa', turnos: HORARIOS_PUBILLA_MA_SA },
    { _key: 'd7', _type: 'diaHorario', dia: 'Su', turnos: [] }
  ],
  direccion: {
    calle: 'Plaça de la Llibertat, 23',
    codigoPostal: '08012',
    ciudad: 'Barcelona',
    provincia: 'Barcelona',
    barrio: 'Gràcia',
    pais: 'ES'
  },
  contacto: { telefono: '+34 932 18 29 94', email: 'lapubillallibertat@gmail.com' },
  redes: { instagram: 'https://www.instagram.com/lapubillagracia' },
  ...crearTextosUiMock('lapubillallibertat@gmail.com', '+34 932 18 29 94'),
  seoTitulo: i18nStr(
    'La Pubilla — Cocina de mercado en Gràcia, Barcelona',
    'La Pubilla — Market cuisine in Gràcia, Barcelona'
  ),
  seoDescripcion: i18nTxt(
    'Casa centenaria en Plaça de la Llibertat. Cocina catalana de mercado, desayunos, menú del día y cenas. Reserva mesa en el corazón de Gràcia.',
    'Century-old house on Plaça de la Llibertat. Catalan market cuisine, breakfasts, daily menu and dinners. Book a table in the heart of Gràcia.'
  )
};

const categoriasVinoPubilla = [
  { _id: ID.catVinoPubilla.blancos, nombre: ['Blancos', 'Whites'], orden: 10 },
  { _id: ID.catVinoPubilla.tintos, nombre: ['Tintos', 'Reds'], orden: 20 },
  { _id: ID.catVinoPubilla.espumosos, nombre: ['Espumosos', 'Sparkling'], orden: 30 }
].map(c => ({
  _id: c._id,
  _type: 'categoriaVino',
  restaurante: ref(ID.restaurantePubilla),
  nombre: i18nStr(c.nombre[0], c.nombre[1]),
  orden: c.orden
}));

const vinosPubilla = [
  {
    catId: ID.catVinoPubilla.blancos,
    nombre: 'Weingut Falk Riesling Trocken 2022',
    region: 'Mosel',
    nota: ['Eléctrico, seco, silencio de iglesia', 'Electric, bone dry, church-quiet'],
    copa: 8,
    botella: 38
  },
  {
    catId: ID.catVinoPubilla.blancos,
    nombre: 'Kalithea Assyrtiko 2023',
    region: 'Santorini',
    nota: ['Volcánico, salino, con carácter', 'Volcanic, saline, argues back'],
    copa: 11,
    botella: 48
  },
  {
    catId: ID.catVinoPubilla.blancos,
    nombre: 'Clos Marin Muscadet "Sur Lie" 2022',
    region: 'Loira',
    nota: ['Clásico de la casa', 'The house classic'],
    copa: 8,
    botella: 36
  },
  {
    catId: ID.catVinoPubilla.blancos,
    nombre: 'Txakoli Itsasoa 2023',
    region: 'Getaria',
    nota: ['Chispeante, con aire de mar', 'Spritzy, sea-air salty'],
    copa: 8,
    botella: 37
  },
  {
    catId: ID.catVinoPubilla.blancos,
    nombre: 'Ferme du Pré Chenin 2022',
    region: 'Anjou',
    nota: ['Ceroso, huerta, honesto', 'Waxy, orchard, honest'],
    copa: 9,
    botella: 44
  },
  {
    catId: ID.catVinoPubilla.blancos,
    nombre: 'Weinhof Grüner Veltliner 2023',
    region: 'Kamptal',
    nota: ['Pimienta blanca, agua fría', 'White pepper, cold water'],
    copa: 8,
    botella: 39
  },
  {
    catId: ID.catVinoPubilla.tintos,
    nombre: 'Domaine Rousset "Les Cailloux" 2023',
    region: 'Beaujolais',
    nota: ['Gamay sin frenos', 'Gamay with the brakes off'],
    copa: 9,
    botella: 42
  },
  {
    catId: ID.catVinoPubilla.tintos,
    nombre: 'Bodega San Roque Garnacha 2021',
    region: 'Gredos',
    nota: ['Cepas viejas, sin maquillaje', 'Old vines, no makeup'],
    copa: 10,
    botella: 46
  },
  {
    catId: ID.catVinoPubilla.tintos,
    nombre: 'Poggio Rosso Nerello 2022',
    region: 'Etna',
    nota: ['Fruta de volcán, hueso fino', 'Volcano fruit, fine bones'],
    copa: 12,
    botella: 54
  },
  {
    catId: ID.catVinoPubilla.tintos,
    nombre: 'Les Failles Trousseau 2022',
    region: 'Jura',
    nota: ['Pálido, salvaje, discretamente serio', 'Pale, wild, quietly serious'],
    copa: 11,
    botella: 50
  },
  {
    catId: ID.catVinoPubilla.espumosos,
    nombre: "Ca' del Vento Frizzante 2023",
    region: 'Emilia',
    nota: ['Turbio, alegre, un poco descarado', 'Cloudy, cheerful, slightly rude'],
    copa: 7,
    botella: 34
  },
  {
    catId: ID.catVinoPubilla.espumosos,
    nombre: 'Casa Brava Pét-Nat Rosé 2024',
    region: 'Penedès',
    nota: ['Fiesta en una botella, sin disculpas', 'Party in a bottle, no apologies'],
    copa: 8,
    botella: 36
  }
].map((v, i) => ({
  _id: `vino-pubilla-${i + 1}`,
  _type: 'vino',
  restaurante: ref(ID.restaurantePubilla),
  categoria: ref(v.catId),
  nombre: v.nombre,
  region: v.region,
  nota: i18nTxt(v.nota[0], v.nota[1]),
  precioCopa: v.copa,
  precioBotella: v.botella,
  orden: (i + 1) * 10,
  activo: true
}));

const categoriasPlatoPubilla = [
  { _id: ID.catPlatoPubilla.paraPicar, nombre: ['Para picar', 'To nibble'], orden: 10 },
  { _id: ID.catPlatoPubilla.frios, nombre: ['Fríos', 'Cold'], orden: 20 },
  { _id: ID.catPlatoPubilla.deCocina, nombre: ['De la cocina', 'From the kitchen'], orden: 30 },
  { _id: ID.catPlatoPubilla.dulces, nombre: ['Dulces', 'Sweet'], orden: 40 }
].map(c => ({
  _id: c._id,
  _type: 'categoriaPlato',
  restaurante: ref(ID.restaurantePubilla),
  nombre: i18nStr(c.nombre[0], c.nombre[1]),
  orden: c.orden
}));

const platosPubilla = [
  {
    catId: ID.catPlatoPubilla.paraPicar,
    nombre: ['Pan de masa madre y mantequilla', 'Sourdough & cultured butter'],
    nota: ['El pan que salvaríamos del fuego', "The loaf we'd save from a fire"],
    precio: 5
  },
  {
    catId: ID.catPlatoPubilla.paraPicar,
    nombre: ['Gildas', 'Gildas'],
    nota: [
      'Anchoa, aceituna, guindilla; un bocado de casa',
      'Anchovy, olive, chilli; one bite of home'
    ],
    precio: 6
  },
  {
    catId: ID.catPlatoPubilla.paraPicar,
    nombre: ['Pimientos de padrón', 'Padrón peppers'],
    nota: ['Fritos, con sal; alguno siempre pica', 'Fried, with salt; one is always hot'],
    precio: 7
  },
  {
    catId: ID.catPlatoPubilla.frios,
    nombre: ['Burrata, naranja sanguina y guindilla', 'Burrata, blood orange, chilli'],
    nota: ['Mientras dure la temporada', 'While the season lasts'],
    precio: 11
  },
  {
    catId: ID.catPlatoPubilla.frios,
    nombre: ['Mortadela, pistacho y focaccia', 'Mortadella, pistachio, focaccia'],
    nota: ['Tibia, recién salida del horno', 'Warm from the oven'],
    precio: 9
  },
  {
    catId: ID.catPlatoPubilla.frios,
    nombre: ['Anchoas sobre tostada', 'Anchovies on toast'],
    nota: ['Mantequilla fría, pan templado', 'Cold butter, warm bread'],
    precio: 8
  },
  {
    catId: ID.catPlatoPubilla.deCocina,
    nombre: ['Puerros a la brasa y romesco', 'Charred leeks, romesco'],
    nota: ['Un clásico bien hecho', 'A classic done right'],
    precio: 8
  },
  {
    catId: ID.catPlatoPubilla.deCocina,
    nombre: ['Croquetas de jamón', 'Ham croquettes'],
    nota: [
      'Cremosas por dentro, paciencia con el primer bocado',
      'Molten inside, patience with the first bite'
    ],
    precio: 8
  },
  {
    catId: ID.catPlatoPubilla.dulces,
    nombre: ['Tarta de queso vasca', 'Basque cheesecake'],
    nota: ['Requemada aposta', 'Burnt on purpose'],
    precio: 7
  }
].map((p, i) => ({
  _id: `plato-pubilla-${i + 1}`,
  _type: 'plato',
  restaurante: ref(ID.restaurantePubilla),
  categoria: ref(p.catId),
  nombre: i18nStr(p.nombre[0], p.nombre[1]),
  nota: i18nTxt(p.nota[0], p.nota[1]),
  precio: p.precio,
  orden: (i + 1) * 10,
  activo: true
}));

// ─────────────────────────────────────────────────────────────────────────────
// LA PRINCIPAL — Sant Antoni · borgoña · signature/author cuisine (mocks)
// ─────────────────────────────────────────────────────────────────────────────

const HORARIOS_PRINCIPAL_LU_SA = [
  { _key: 't1', _type: 'turno', apertura: '13:00', cierre: '16:00' },
  { _key: 't2', _type: 'turno', apertura: '20:00', cierre: '23:30' }
];

const restauranteLaPrincipal = {
  _id: ID.restaurantePrincipal,
  _type: 'restaurante',
  nombre: 'La Principal',
  slug: { _type: 'slug', current: 'la-principal' },
  dominio: 'https://laprincipal.com',
  colorMarca: '#7a4a56',
  idiomaPorDefecto: ref(ID.idiomaEs),
  idiomasActivos: [
    { _key: 'la-es', ...ref(ID.idiomaEs) },
    { _key: 'la-en', ...ref(ID.idiomaEn) }
  ],
  heroTitulo: i18nStr('Cocina catalana', 'Catalan cuisine'),
  heroSubtitulo: i18nStr('De autor', 'Signature'),
  heroMetaIzq: i18nStr('Restaurante en Sant Antoni.', 'Restaurant in Sant Antoni.'),
  heroMetaDer: i18nStr('Barcelona', 'Barcelona'),
  heroNota: i18nTxt(
    'Abierto de lunes a sábado.\nComidas y cenas.',
    'Open Monday to Saturday.\nLunches and dinners.'
  ),
  heroCta: i18nStr('Reservar', 'Book'),
  manifiestoEyebrow: i18nStr('Desde 1985 en Sant Antoni', 'Since 1985 in Sant Antoni'),
  manifiestoTexto: i18nTxt(
    'Cocina catalana con firma, temporada, y una mesa donde el rato importa.',
    'Catalan cuisine with a signature touch, in season, and a table where time matters.'
  ),
  sobreEyebrow: i18nStr('Nuestra historia', 'Our story'),
  sobreTitulo: i18nStr('Tres generaciones en el barrio', 'Three generations in the neighbourhood'),
  sobreCuerpo: i18nRich(
    [
      'La Principal abrió en 1985 y desde entonces ha pasado por tres generaciones de la misma familia. Empezamos como fonda de barrio, hoy somos referencia de cocina catalana contemporánea en Sant Antoni.',
      'Trabajamos con productores del Mercat de Sant Antoni y proveedores de proximidad. La carta cambia cada temporada con la misma idea de siempre: técnica moderna, producto de siempre.'
    ],
    [
      "La Principal opened in 1985 and has since passed through three generations of the same family. We started as a neighbourhood tavern; today we're a reference for contemporary Catalan cuisine in Sant Antoni.",
      'We work with producers from the Mercat de Sant Antoni and local farms. The menu changes each season with the same idea as always: modern technique, timeless produce.'
    ]
  ),
  gruposEyebrow: i18nStr('Eventos privados', 'Private events'),
  gruposTitulo: i18nStr('Reserva la sala entera', 'Book the whole room'),
  gruposCta: i18nStr('Consultar', 'Enquire'),
  horariosTitulo: i18nStr('Nos encontrarás aquí', 'Find us here'),
  horariosTexto: i18nTxt(
    'Comidas y cenas de lunes a sábado, 13:00–16:00 y 20:00–23:30. Domingos, cerrado.',
    'Lunches and dinners Monday to Saturday, 13:00–16:00 and 20:00–23:30. Sundays, closed.'
  ),
  horariosAbierto: i18nStr('Estamos abiertos hasta las {hora}.', 'Open now until {hora}.'),
  horariosProximaApertura: i18nStr('Hoy abrimos a las {hora}.', 'Opens today at {hora}.'),
  horariosCerrado: i18nStr('Hoy no abrimos. Nos vemos mañana.', 'Closed today. See you tomorrow.'),
  horariosSemana: [
    { _key: 'd1', _type: 'diaHorario', dia: 'Mo', turnos: HORARIOS_PRINCIPAL_LU_SA },
    { _key: 'd2', _type: 'diaHorario', dia: 'Tu', turnos: HORARIOS_PRINCIPAL_LU_SA },
    { _key: 'd3', _type: 'diaHorario', dia: 'We', turnos: HORARIOS_PRINCIPAL_LU_SA },
    { _key: 'd4', _type: 'diaHorario', dia: 'Th', turnos: HORARIOS_PRINCIPAL_LU_SA },
    { _key: 'd5', _type: 'diaHorario', dia: 'Fr', turnos: HORARIOS_PRINCIPAL_LU_SA },
    { _key: 'd6', _type: 'diaHorario', dia: 'Sa', turnos: HORARIOS_PRINCIPAL_LU_SA },
    { _key: 'd7', _type: 'diaHorario', dia: 'Su', turnos: [] }
  ],
  direccion: {
    calle: 'Carrer del Comte Borrell, 55',
    codigoPostal: '08015',
    ciudad: 'Barcelona',
    provincia: 'Barcelona',
    barrio: 'Sant Antoni',
    pais: 'ES'
  },
  contacto: { telefono: '+34 934 42 55 76', email: 'hola@laprincipal.com' },
  redes: { instagram: 'https://www.instagram.com/laprincipalbcn' },
  ...crearTextosUiMock('hola@laprincipal.com', '+34 934 42 55 76'),
  seoTitulo: i18nStr(
    'La Principal — Cocina catalana en Sant Antoni, Barcelona',
    'La Principal — Catalan cuisine in Sant Antoni, Barcelona'
  ),
  seoDescripcion: i18nTxt(
    'Restaurante familiar desde 1985. Cocina catalana de temporada en el corazón de Sant Antoni. Reserva mesa hoy.',
    'Family restaurant since 1985. Seasonal Catalan cuisine in the heart of Sant Antoni. Book your table today.'
  )
};

const categoriasVinoPrincipal = [
  { _id: ID.catVinoPrincipal.blancos, nombre: ['Blancos', 'Whites'], orden: 10 },
  { _id: ID.catVinoPrincipal.tintos, nombre: ['Tintos', 'Reds'], orden: 20 },
  { _id: ID.catVinoPrincipal.espumosos, nombre: ['Espumosos', 'Sparkling'], orden: 30 }
].map(c => ({
  _id: c._id,
  _type: 'categoriaVino',
  restaurante: ref(ID.restaurantePrincipal),
  nombre: i18nStr(c.nombre[0], c.nombre[1]),
  orden: c.orden
}));

const vinosPrincipal = [
  {
    catId: ID.catVinoPrincipal.blancos,
    nombre: 'Xarel·lo Vell 2022',
    region: 'Penedès',
    nota: ['Fruta blanca, tostados sutiles', 'White fruit, subtle toast'],
    copa: 7,
    botella: 32
  },
  {
    catId: ID.catVinoPrincipal.blancos,
    nombre: 'Godello del Bierzo 2023',
    region: 'Bierzo',
    nota: ['Mineral, longitud', 'Mineral, long finish'],
    copa: 8,
    botella: 36
  },
  {
    catId: ID.catVinoPrincipal.blancos,
    nombre: 'Albariño Ribeira 2023',
    region: 'Rías Baixas',
    nota: ['Marino, tenso', 'Marine, tense'],
    copa: 9,
    botella: 40
  },
  {
    catId: ID.catVinoPrincipal.tintos,
    nombre: 'Priorat de la Bodega 2020',
    region: 'Priorat',
    nota: ['Piedra, cereza, kilómetros', 'Stone, cherry, miles'],
    copa: 12,
    botella: 54
  },
  {
    catId: ID.catVinoPrincipal.tintos,
    nombre: 'Tempranillo Reserva 2019',
    region: 'Rioja',
    nota: ['Clásico bien hecho', 'A classic done right'],
    copa: 10,
    botella: 45
  },
  {
    catId: ID.catVinoPrincipal.tintos,
    nombre: 'Mencía Vella 2022',
    region: 'Ribeira Sacra',
    nota: ['Ligero, mineral, elegante', 'Light, mineral, elegant'],
    copa: 9,
    botella: 42
  },
  {
    catId: ID.catVinoPrincipal.espumosos,
    nombre: 'Cava Brut Nature Reserva',
    region: 'Penedès',
    nota: ['Seco, dorado, pan tostado', 'Dry, golden, toasty'],
    copa: 7,
    botella: 34
  },
  {
    catId: ID.catVinoPrincipal.espumosos,
    nombre: 'Espumoso Xarel·lo 2022',
    region: 'Penedès',
    nota: ['Fresco, cítrico', 'Fresh, citrus'],
    copa: 8,
    botella: 38
  }
].map((v, i) => ({
  _id: `vino-principal-${i + 1}`,
  _type: 'vino',
  restaurante: ref(ID.restaurantePrincipal),
  categoria: ref(v.catId),
  nombre: v.nombre,
  region: v.region,
  nota: i18nTxt(v.nota[0], v.nota[1]),
  precioCopa: v.copa,
  precioBotella: v.botella,
  orden: (i + 1) * 10,
  activo: true
}));

const categoriasPlatoPrincipal = [
  { _id: ID.catPlatoPrincipal.entrantes, nombre: ['Entrantes', 'Starters'], orden: 10 },
  { _id: ID.catPlatoPrincipal.principales, nombre: ['Principales', 'Mains'], orden: 20 },
  { _id: ID.catPlatoPrincipal.postres, nombre: ['Postres', 'Desserts'], orden: 30 }
].map(c => ({
  _id: c._id,
  _type: 'categoriaPlato',
  restaurante: ref(ID.restaurantePrincipal),
  nombre: i18nStr(c.nombre[0], c.nombre[1]),
  orden: c.orden
}));

const platosPrincipal = [
  {
    catId: ID.catPlatoPrincipal.entrantes,
    nombre: ['Escalivada con anchoas', 'Escalivada with anchovies'],
    nota: ['Berenjena, pimiento y cebolla ahumados', 'Aubergine, pepper and onion, smoked'],
    precio: 12
  },
  {
    catId: ID.catPlatoPrincipal.entrantes,
    nombre: ['Buñuelos de bacalao', 'Cod fritters'],
    nota: ['Recién hechos, alioli suave', 'Just fried, soft aioli'],
    precio: 10
  },
  {
    catId: ID.catPlatoPrincipal.entrantes,
    nombre: ['Carpaccio de gambas', 'Prawn carpaccio'],
    nota: ['Aceite de hierbas, sal en escamas', 'Herb oil, flaky salt'],
    precio: 16
  },
  {
    catId: ID.catPlatoPrincipal.principales,
    nombre: ['Arroz de sepia y alcachofas', 'Cuttlefish and artichoke rice'],
    nota: ['Para dos, pedirlo con tiempo', 'For two, order in advance'],
    precio: 22
  },
  {
    catId: ID.catPlatoPrincipal.principales,
    nombre: ['Costilla de cerdo confitada', 'Confit pork rib'],
    nota: ['12 horas al fuego bajo', '12 hours slow-cooked'],
    precio: 18
  },
  {
    catId: ID.catPlatoPrincipal.principales,
    nombre: ['Bacalao al pil pil', 'Cod pil pil'],
    nota: ['Emulsión clásica, cocido al punto', 'Classic emulsion, cooked to point'],
    precio: 21
  },
  {
    catId: ID.catPlatoPrincipal.postres,
    nombre: ['Crema catalana', 'Crema catalana'],
    nota: ['La de siempre, quemada al momento', 'The classic, torched to order'],
    precio: 7
  },
  {
    catId: ID.catPlatoPrincipal.postres,
    nombre: ['Chocolate y aceite', 'Chocolate & olive oil'],
    nota: ['Con sal en escamas', 'With flaky salt'],
    precio: 8
  }
].map((p, i) => ({
  _id: `plato-principal-${i + 1}`,
  _type: 'plato',
  restaurante: ref(ID.restaurantePrincipal),
  categoria: ref(p.catId),
  nombre: i18nStr(p.nombre[0], p.nombre[1]),
  nota: i18nTxt(p.nota[0], p.nota[1]),
  precio: p.precio,
  orden: (i + 1) * 10,
  activo: true
}));

// ─────────────────────────────────────────────────────────────────────────────
// CASABELLA — Poblenou · warm-dark · mediterráneo contemporáneo (mocks)
// ─────────────────────────────────────────────────────────────────────────────

const HORARIOS_CASABELLA_NOCHE = [
  { _key: 't1', _type: 'turno', apertura: '20:00', cierre: '23:30' }
];
const HORARIOS_CASABELLA_FINDE = [
  { _key: 't1', _type: 'turno', apertura: '13:00', cierre: '16:00' },
  { _key: 't2', _type: 'turno', apertura: '20:00', cierre: '23:30' }
];

const restauranteCasabella = {
  _id: ID.restauranteCasabella,
  _type: 'restaurante',
  nombre: 'Casabella',
  slug: { _type: 'slug', current: 'casabella' },
  dominio: 'https://casabella.com',
  colorMarca: '#d4a655',
  idiomaPorDefecto: ref(ID.idiomaEs),
  idiomasActivos: [
    { _key: 'la-es', ...ref(ID.idiomaEs) },
    { _key: 'la-en', ...ref(ID.idiomaEn) }
  ],
  heroTitulo: i18nStr('Cocina mediterránea', 'Mediterranean cuisine'),
  heroSubtitulo: i18nStr('en Poblenou', 'in Poblenou'),
  heroMetaIzq: i18nStr('Restaurante contemporáneo', 'Contemporary restaurant'),
  heroMetaDer: i18nStr('Barcelona · Poblenou', 'Barcelona · Poblenou'),
  heroNota: i18nTxt(
    'Cocina abierta de miércoles a domingo.\nCenas siempre, comidas fin de semana.',
    'Kitchen open Wednesday to Sunday.\nDinner always, lunch on weekends.'
  ),
  heroCta: i18nStr('Reservar mesa', 'Book a table'),
  manifiestoEyebrow: i18nStr('Casabella · Poblenou', 'Casabella · Poblenou'),
  manifiestoTexto: i18nTxt(
    'Mediterráneo contemporáneo, producto de temporada y una carta breve que se piensa cada día.',
    'Contemporary Mediterranean, seasonal produce and a short menu rethought each day.'
  ),
  sobreEyebrow: i18nStr('Sobre Casabella', 'About Casabella'),
  sobreTitulo: i18nStr('Una casa en Poblenou', 'A home in Poblenou'),
  sobreCuerpo: i18nRich(
    [
      'Casabella nació en 2019 con la idea de traer la calidez de una casa mediterránea al espacio industrial de Poblenou. Cocina abierta, producto de mercado, y una carta corta que cambia con lo que llega ese día del Mercat.',
      'Nuestro equipo viene de cocinas de Cataluña, Sicilia y el sur de Francia. Cada plato refleja ese cruce de raíces: sencillez mediterránea con técnica moderna, sin artificios.'
    ],
    [
      "Casabella was born in 2019 with the idea of bringing the warmth of a Mediterranean home to Poblenou's industrial space. Open kitchen, market produce, and a short menu that changes with whatever arrives from the Mercat that day.",
      'Our team comes from kitchens in Catalonia, Sicily and southern France. Each dish reflects that crossroads of roots: Mediterranean simplicity with modern technique, no fuss.'
    ]
  ),
  gruposEyebrow: i18nStr('Eventos y grupos', 'Events & groups'),
  gruposTitulo: i18nStr('Un espacio para tus celebraciones', 'A space for your celebrations'),
  gruposCta: i18nStr('Consultar', 'Enquire'),
  horariosTitulo: i18nStr('Visítanos', 'Visit us'),
  horariosTexto: i18nTxt(
    'Miércoles a viernes, 20:00–23:30. Sábado y domingo, 13:00–16:00 y 20:00–23:30. Lunes y martes cerrado.',
    'Wednesday to Friday, 20:00–23:30. Saturday and Sunday, 13:00–16:00 and 20:00–23:30. Monday and Tuesday closed.'
  ),
  horariosAbierto: i18nStr('Estamos abiertos hasta las {hora}.', 'Open now until {hora}.'),
  horariosProximaApertura: i18nStr('Hoy abrimos a las {hora}.', 'Opens today at {hora}.'),
  horariosCerrado: i18nStr('Hoy no abrimos. Nos vemos mañana.', 'Closed today. See you tomorrow.'),
  horariosSemana: [
    { _key: 'd1', _type: 'diaHorario', dia: 'Mo', turnos: [] },
    { _key: 'd2', _type: 'diaHorario', dia: 'Tu', turnos: [] },
    { _key: 'd3', _type: 'diaHorario', dia: 'We', turnos: HORARIOS_CASABELLA_NOCHE },
    { _key: 'd4', _type: 'diaHorario', dia: 'Th', turnos: HORARIOS_CASABELLA_NOCHE },
    { _key: 'd5', _type: 'diaHorario', dia: 'Fr', turnos: HORARIOS_CASABELLA_NOCHE },
    { _key: 'd6', _type: 'diaHorario', dia: 'Sa', turnos: HORARIOS_CASABELLA_FINDE },
    { _key: 'd7', _type: 'diaHorario', dia: 'Su', turnos: HORARIOS_CASABELLA_FINDE }
  ],
  direccion: {
    calle: 'Carrer de Pujades, 220',
    codigoPostal: '08005',
    ciudad: 'Barcelona',
    provincia: 'Barcelona',
    barrio: 'Poblenou',
    pais: 'ES'
  },
  contacto: {
    telefono: '+34 933 09 12 45',
    whatsapp: '+34 673 45 67 89',
    email: 'hola@casabella.com'
  },
  mostrarRedes: false,
  redes: { instagram: 'https://www.instagram.com/casabella.bcn' },
  mostrarResenas: false,
  ...crearTextosUiMock('hola@casabella.com', '+34 933 09 12 45'),
  seoTitulo: i18nStr(
    'Casabella — Cocina mediterránea contemporánea en Poblenou, Barcelona',
    'Casabella — Contemporary Mediterranean cuisine in Poblenou, Barcelona'
  ),
  seoDescripcion: i18nTxt(
    'Cocina mediterránea contemporánea en Poblenou. Producto de mercado, carta corta que cambia a diario. Reserva mesa en Barcelona.',
    'Contemporary Mediterranean cuisine in Poblenou. Market produce, short daily-changing menu. Book a table in Barcelona.'
  ),
  // IA · SEO avanzado
  resumenIA: i18nTxt(
    'Casabella es un restaurante mediterráneo contemporáneo en Poblenou, Barcelona. Abierto desde 2019, ofrece cocina de mercado con influencias catalanas, sicilianas y del sur de Francia. Carta corta que rota cada semana según los productos del Mercat de Sant Antoni. Cocina abierta de miércoles a domingo (cenas de miércoles a viernes; comidas y cenas los fines de semana). Precio medio 35 € por persona con dos platos y bebida. Reservas recomendadas, especialmente fin de semana.',
    'Casabella is a contemporary Mediterranean restaurant in Poblenou, Barcelona. Open since 2019, it offers market cuisine with Catalan, Sicilian and southern French influences. A short menu that rotates weekly with produce from the Mercat de Sant Antoni. Kitchen open Wednesday to Sunday (dinner Wed–Fri; lunch and dinner on weekends). Average €35 per person for two courses and a drink. Reservations recommended, especially at weekends.'
  ),
  aceptaReservas: true,
  precioMedio: 35,
  cloudflareAnalyticsToken: '[COMPLETAR - pegar token desde dash.cloudflare.com]',
  formasPago: [
    'cash',
    'credit_card',
    'debit_card',
    'contactless',
    'apple_pay',
    'google_pay',
    'bizum'
  ],
  serviciosExtras: ['grupos', 'vegetariano', 'carta_vinos', 'bar', 'menu_degustacion'],
  faq: [
    {
      _key: 'faq1',
      _type: 'faqItem',
      pregunta: i18nStr('¿Qué tipo de cocina sirven?', 'What type of cuisine do you serve?'),
      respuesta: i18nTxt(
        'Cocina mediterránea contemporánea con influencias de Cataluña, Sicilia y el sur de Francia. Trabajamos con producto de mercado del Mercat de Sant Antoni y proveedores de proximidad. La carta es corta a propósito: entre 8 y 12 platos que cambian cada semana según lo que llega mejor ese día.',
        'Contemporary Mediterranean cuisine with influences from Catalonia, Sicily and southern France. We work with produce from the Mercat de Sant Antoni and local suppliers. The menu is intentionally short: 8 to 12 dishes that change each week based on what arrives best that day.'
      )
    },
    {
      _key: 'faq2',
      _type: 'faqItem',
      pregunta: i18nStr('¿Dónde están ubicados?', 'Where are you located?'),
      respuesta: i18nTxt(
        'En el barrio de Poblenou, Barcelona: Carrer de Pujades, 220, 08005 Barcelona. A 5 minutos andando de la parada de metro Poblenou (L4 amarilla) y a 10 minutos de la playa del Bogatell.',
        'In the Poblenou neighborhood of Barcelona: Carrer de Pujades, 220, 08005 Barcelona. A 5-minute walk from Poblenou metro station (L4 yellow line) and 10 minutes from Bogatell beach.'
      )
    },
    {
      _key: 'faq3',
      _type: 'faqItem',
      pregunta: i18nStr('¿Cuál es vuestro horario?', 'What are your opening hours?'),
      respuesta: i18nTxt(
        'De miércoles a viernes servimos solo cenas, de 20:00 a 23:30. Sábados y domingos abrimos también a mediodía, de 13:00 a 16:00 y de 20:00 a 23:30. Lunes y martes cerramos.',
        'Wednesday to Friday we serve only dinner, from 20:00 to 23:30. On Saturdays and Sundays we also open for lunch, from 13:00 to 16:00 and 20:00 to 23:30. Closed on Mondays and Tuesdays.'
      )
    },
    {
      _key: 'faq4',
      _type: 'faqItem',
      pregunta: i18nStr('¿Necesito reservar mesa?', 'Do I need to book a table?'),
      respuesta: i18nTxt(
        'Sí, lo recomendamos siempre, sobre todo los fines de semana. Puedes reservar desde el formulario de la web, escribiéndonos a hola@casabella.com o llamando al +34 933 09 12 45. Confirmamos por email en cuanto vemos la solicitud.',
        'Yes, we always recommend it, especially at weekends. You can book from the form on the website, by writing to hola@casabella.com or by calling +34 933 09 12 45. We confirm by email as soon as we see the request.'
      )
    },
    {
      _key: 'faq5',
      _type: 'faqItem',
      pregunta: i18nStr(
        '¿Cuál es el precio medio por persona?',
        'What is the average price per person?'
      ),
      respuesta: i18nTxt(
        'Alrededor de 35 € por persona con dos platos y una bebida. Los entrantes van desde 6 € y los principales entre 17 € y 24 €. Los postres cuestan entre 7 € y 8 €.',
        'Around €35 per person for two courses and a drink. Starters from €6 and mains between €17 and €24. Desserts are €7 to €8.'
      )
    },
    {
      _key: 'faq6',
      _type: 'faqItem',
      pregunta: i18nStr('¿Tenéis opciones vegetarianas?', 'Do you have vegetarian options?'),
      respuesta: i18nTxt(
        'Sí, siempre hay al menos tres o cuatro platos vegetarianos en la carta (ensalada de tomate y burrata, risotto de calabaza, focaccia, verduras de temporada). Podemos adaptar la mayoría de platos y siempre preguntamos por alergias e intolerancias al llegar.',
        'Yes, there are always at least three or four vegetarian dishes on the menu (tomato and burrata salad, pumpkin risotto, focaccia, seasonal vegetables). We can adapt most dishes and always ask about allergies and intolerances when you arrive.'
      )
    },
    {
      _key: 'faq7',
      _type: 'faqItem',
      pregunta: i18nStr(
        '¿Podemos ir en grupo o hacer un evento privado?',
        'Can we come as a group or book a private event?'
      ),
      respuesta: i18nTxt(
        'Sí, disponemos de espacio para grupos y podemos privatizar la sala para celebraciones. Para grupos de más de 8 personas trabajamos con menú cerrado. Escríbenos con antelación a hola@casabella.com y te preparamos una propuesta a medida.',
        "Yes, we have space for groups and can book the whole room for private celebrations. For groups over 8 people we work with a set menu. Please write in advance to hola@casabella.com and we'll prepare a tailored proposal."
      )
    },
    {
      _key: 'faq8',
      _type: 'faqItem',
      pregunta: i18nStr('¿Qué formas de pago aceptáis?', 'What payment methods do you accept?'),
      respuesta: i18nTxt(
        'Aceptamos efectivo, tarjeta de crédito, tarjeta de débito, contactless, Apple Pay, Google Pay y Bizum. No hacemos falta separar cuentas si sois varios: podemos cobrar por separado sin problema.',
        'We accept cash, credit card, debit card, contactless, Apple Pay, Google Pay and Bizum. No problem if you want to split the bill, we can charge separately.'
      )
    }
  ]
};

const categoriasVinoCasabella = [
  { _id: ID.catVinoCasabella.blancos, nombre: ['Blancos', 'Whites'], orden: 10 },
  { _id: ID.catVinoCasabella.tintos, nombre: ['Tintos', 'Reds'], orden: 20 },
  {
    _id: ID.catVinoCasabella.burbujas,
    nombre: ['Burbujas y rosados', 'Bubbles & rosés'],
    orden: 30
  }
].map(c => ({
  _id: c._id,
  _type: 'categoriaVino',
  restaurante: ref(ID.restauranteCasabella),
  nombre: i18nStr(c.nombre[0], c.nombre[1]),
  orden: c.orden
}));

const vinosCasabella = [
  {
    catId: ID.catVinoCasabella.blancos,
    nombre: 'Vermentino Costa Toscana 2023',
    region: 'Toscana',
    nota: ['Frutas blancas, aire de mar', 'White fruits, sea breeze'],
    copa: 8,
    botella: 38
  },
  {
    catId: ID.catVinoCasabella.blancos,
    nombre: 'Grillo Sicilia 2022',
    region: 'Sicilia',
    nota: ['Cítrico, mineral, muy fresco', 'Citrus, mineral, very fresh'],
    copa: 7,
    botella: 32
  },
  {
    catId: ID.catVinoCasabella.blancos,
    nombre: 'Picpoul de Pinet 2023',
    region: 'Languedoc',
    nota: ['Ligero, salino, ostras', 'Light, saline, made for oysters'],
    copa: 7,
    botella: 30
  },
  {
    catId: ID.catVinoCasabella.tintos,
    nombre: "Nero d'Avola 2022",
    region: 'Sicilia',
    nota: ['Fruta oscura, especias suaves', 'Dark fruit, gentle spice'],
    copa: 9,
    botella: 40
  },
  {
    catId: ID.catVinoCasabella.tintos,
    nombre: 'Pinot Nero Alto Adige 2021',
    region: 'Alto Adige',
    nota: ['Elegante, cereza fresca', 'Elegant, fresh cherry'],
    copa: 11,
    botella: 50
  },
  {
    catId: ID.catVinoCasabella.tintos,
    nombre: 'Bandol Rouge 2020',
    region: 'Provenza',
    nota: ['Estructurado, garriga', 'Structured, garrigue'],
    copa: 12,
    botella: 55
  },
  {
    catId: ID.catVinoCasabella.burbujas,
    nombre: 'Rosé de Provence 2023',
    region: 'Provenza',
    nota: ['Pálido, floral, para todo', 'Pale, floral, food-friendly'],
    copa: 8,
    botella: 36
  },
  {
    catId: ID.catVinoCasabella.burbujas,
    nombre: 'Franciacorta Brut',
    region: 'Lombardía',
    nota: ['Fina burbuja, brioche', 'Fine bubble, brioche'],
    copa: 10,
    botella: 48
  }
].map((v, i) => ({
  _id: `vino-casabella-${i + 1}`,
  _type: 'vino',
  restaurante: ref(ID.restauranteCasabella),
  categoria: ref(v.catId),
  nombre: v.nombre,
  region: v.region,
  nota: i18nTxt(v.nota[0], v.nota[1]),
  precioCopa: v.copa,
  precioBotella: v.botella,
  orden: (i + 1) * 10,
  activo: true
}));

const categoriasPlatoCasabella = [
  { _id: ID.catPlatoCasabella.entrantes, nombre: ['Entrantes', 'Starters'], orden: 10 },
  { _id: ID.catPlatoCasabella.principales, nombre: ['Principales', 'Mains'], orden: 20 },
  { _id: ID.catPlatoCasabella.postres, nombre: ['Postres', 'Desserts'], orden: 30 }
].map(c => ({
  _id: c._id,
  _type: 'categoriaPlato',
  restaurante: ref(ID.restauranteCasabella),
  nombre: i18nStr(c.nombre[0], c.nombre[1]),
  orden: c.orden
}));

const platosCasabella = [
  {
    catId: ID.catPlatoCasabella.entrantes,
    nombre: ['Focaccia con aceite de Sicilia', 'Focaccia with Sicilian olive oil'],
    nota: ['Recién horneada, mantequilla ahumada', 'Freshly baked, smoked butter'],
    precio: 6
  },
  {
    catId: ID.catPlatoCasabella.entrantes,
    nombre: ['Vitello tonnato', 'Vitello tonnato'],
    nota: ['Ternera, salsa de atún, alcaparras', 'Veal, tuna sauce, capers'],
    precio: 14
  },
  {
    catId: ID.catPlatoCasabella.entrantes,
    nombre: ['Ensalada de tomate y burrata', 'Tomato and burrata salad'],
    nota: ['Tomate de temporada, albahaca', 'Seasonal tomato, basil'],
    precio: 13
  },
  {
    catId: ID.catPlatoCasabella.principales,
    nombre: ['Espaguetis con almejas', 'Spaghetti with clams'],
    nota: ['Al vino blanco, guindilla, perejil', 'White wine, chilli, parsley'],
    precio: 18
  },
  {
    catId: ID.catPlatoCasabella.principales,
    nombre: ['Risotto de calabaza y salvia', 'Pumpkin & sage risotto'],
    nota: ['Parmesano añejado 24 meses', 'Aged parmesan 24 months'],
    precio: 17
  },
  {
    catId: ID.catPlatoCasabella.principales,
    nombre: ['Lubina al horno con hinojo', 'Baked sea bass with fennel'],
    nota: ['Pescado del día, cítrico, aceituna', 'Fish of the day, citrus, olive'],
    precio: 24
  },
  {
    catId: ID.catPlatoCasabella.postres,
    nombre: ['Tiramisú clásico', 'Classic tiramisú'],
    nota: ['Mascarpone, café, cacao', 'Mascarpone, coffee, cocoa'],
    precio: 8
  },
  {
    catId: ID.catPlatoCasabella.postres,
    nombre: ['Panna cotta con frambuesa', 'Panna cotta with raspberry'],
    nota: ['Fresca, ligera, casera', 'Fresh, light, homemade'],
    precio: 7
  }
].map((p, i) => ({
  _id: `plato-casabella-${i + 1}`,
  _type: 'plato',
  restaurante: ref(ID.restauranteCasabella),
  categoria: ref(p.catId),
  nombre: i18nStr(p.nombre[0], p.nombre[1]),
  nota: i18nTxt(p.nota[0], p.nota[1]),
  precio: p.precio,
  orden: (i + 1) * 10,
  activo: true
}));

// ─────────────────────────────────────────────────────────────────────────────
// CASABELLA — Páginas legales (plantillas base, cliente completa CIF y titular)
// ─────────────────────────────────────────────────────────────────────────────

const avisoLegalCasabellaES = contenidoLegal(
  [
    ['h2', 'Titular del sitio web'],
    ['normal', 'Denominación: [Nombre fiscal — pendiente de completar por el cliente]'],
    ['normal', 'CIF/NIF: [CIF — pendiente de completar]'],
    ['normal', 'Domicilio: Carrer de Pujades, 220, 08005 Barcelona'],
    ['normal', 'Email: hola@casabella.com'],
    ['normal', 'Teléfono: +34 933 09 12 45'],
    ['h2', 'Objeto'],
    [
      'normal',
      'El presente sitio web (en adelante, "el Sitio") es propiedad del titular indicado y tiene por finalidad informar sobre el restaurante Casabella, su carta, horarios, y facilitar la gestión de reservas.'
    ],
    ['h2', 'Condiciones de uso'],
    [
      'normal',
      'El acceso y uso de este Sitio implica la aceptación expresa y plena de las presentes condiciones. El usuario se compromete a utilizar los contenidos y servicios de forma diligente y correcta, y a no realizar actividades que puedan dañar, sobrecargar o deteriorar el Sitio.'
    ],
    ['h2', 'Propiedad intelectual'],
    [
      'normal',
      'Todos los contenidos del Sitio (textos, imágenes, marcas, logotipos, diseño gráfico) son propiedad del titular o cuentan con las autorizaciones correspondientes. Queda prohibida su reproducción, distribución o transformación total o parcial sin autorización expresa por escrito.'
    ],
    ['h2', 'Enlaces a sitios de terceros'],
    [
      'normal',
      'El Sitio puede contener enlaces a sitios web de terceros (Google Maps, Instagram, WhatsApp, entre otros). El titular no se hace responsable del contenido, las políticas ni las prácticas de dichos sitios.'
    ],
    ['h2', 'Legislación aplicable y jurisdicción'],
    [
      'normal',
      'Las presentes condiciones se rigen por la legislación española. Para cualquier controversia derivada del uso del Sitio, las partes se someten a los juzgados y tribunales del domicilio del titular, salvo que la normativa aplicable disponga otro fuero.'
    ],
    ['h2', 'Modificaciones'],
    [
      'normal',
      'El titular se reserva el derecho a modificar el contenido de este aviso legal en cualquier momento. Las modificaciones entrarán en vigor desde el momento de su publicación en el Sitio.'
    ]
  ],
  'aves'
);

const avisoLegalCasabellaEN = contenidoLegal(
  [
    ['h2', 'Website owner'],
    ['normal', 'Company name: [Legal name — to be completed by the owner]'],
    ['normal', 'Tax ID: [CIF — to be completed]'],
    ['normal', 'Address: Carrer de Pujades, 220, 08005 Barcelona, Spain'],
    ['normal', 'Email: hola@casabella.com'],
    ['normal', 'Phone: +34 933 09 12 45'],
    ['h2', 'Purpose'],
    [
      'normal',
      'This website (hereinafter, "the Site") is owned by the entity listed above. Its purpose is to provide information about Casabella restaurant, its menu, opening hours, and to facilitate table reservations.'
    ],
    ['h2', 'Terms of use'],
    [
      'normal',
      'Access to and use of this Site implies full and express acceptance of these terms. Users agree to use the content and services diligently and correctly, and shall not carry out activities that may damage, overload or impair the Site.'
    ],
    ['h2', 'Intellectual property'],
    [
      'normal',
      'All content on the Site (texts, images, trademarks, logos, graphic design) is owned by the owner or is used with proper authorization. Total or partial reproduction, distribution or transformation without express written permission is prohibited.'
    ],
    ['h2', 'Links to third-party sites'],
    [
      'normal',
      'The Site may contain links to third-party websites (Google Maps, Instagram, WhatsApp, among others). The owner is not responsible for the content, policies or practices of those sites.'
    ],
    ['h2', 'Governing law and jurisdiction'],
    [
      'normal',
      "These terms are governed by Spanish law. Any disputes arising from the use of the Site shall be submitted to the courts of the owner's domicile, unless the applicable regulations establish another jurisdiction."
    ],
    ['h2', 'Modifications'],
    [
      'normal',
      'The owner reserves the right to modify this legal notice at any time. Changes take effect from the moment they are published on the Site.'
    ]
  ],
  'aven'
);

const privacidadCasabellaES = contenidoLegal(
  [
    ['h2', 'Responsable del tratamiento'],
    ['normal', 'Denominación: [Nombre fiscal — pendiente de completar]'],
    ['normal', 'CIF/NIF: [CIF — pendiente de completar]'],
    ['normal', 'Domicilio: Carrer de Pujades, 220, 08005 Barcelona'],
    ['normal', 'Email: hola@casabella.com'],
    ['normal', 'Teléfono: +34 933 09 12 45'],
    ['h2', 'Datos personales que recogemos'],
    [
      'normal',
      'Cuando rellenas el formulario de reserva o nos contactas por email, WhatsApp o teléfono, recogemos los siguientes datos:'
    ],
    ['normal', '• Nombre'],
    ['normal', '• Teléfono'],
    ['normal', '• Email (si nos lo facilitas)'],
    ['normal', '• Fecha, hora y número de comensales'],
    ['normal', '• Notas adicionales que quieras compartir (alergias, celebración, preferencias)'],
    ['h2', 'Finalidad del tratamiento'],
    [
      'normal',
      'Los datos se utilizan exclusivamente para gestionar tu reserva, confirmarla y comunicarnos contigo en relación con la visita al restaurante. No se utilizan para publicidad ni se ceden a terceros con fines comerciales.'
    ],
    ['h2', 'Base legal del tratamiento'],
    [
      'normal',
      'La base legal para tratar tus datos es tu consentimiento explícito al enviar el formulario o iniciar la comunicación por otro canal (artículo 6.1.a del Reglamento General de Protección de Datos).'
    ],
    ['h2', 'Destinatarios de los datos'],
    [
      'normal',
      'Tus datos no se ceden a terceros. Son tratados internamente por el personal de Casabella responsable de la gestión de reservas. Únicamente podrían compartirse con autoridades públicas cuando exista una obligación legal.'
    ],
    ['h2', 'Plazo de conservación'],
    [
      'normal',
      'Los datos se conservan durante el tiempo estrictamente necesario para gestionar la reserva y, posteriormente, se eliminan de nuestros sistemas, salvo que exista obligación legal de conservarlos por un plazo superior.'
    ],
    ['h2', 'Tus derechos'],
    ['normal', 'Puedes ejercer en cualquier momento los siguientes derechos:'],
    ['normal', '• Acceso: saber qué datos tuyos tenemos.'],
    ['normal', '• Rectificación: corregir datos incorrectos o incompletos.'],
    ['normal', '• Supresión: eliminar tus datos.'],
    ['normal', '• Oposición: oponerte al tratamiento.'],
    ['normal', '• Limitación: pedir que restrinjamos el uso.'],
    ['normal', '• Portabilidad: recibir tus datos en formato estructurado.'],
    [
      'normal',
      'Para ejercer cualquiera de estos derechos, escribe a hola@casabella.com adjuntando copia de tu DNI o documento equivalente.'
    ],
    ['h2', 'Reclamaciones ante la autoridad de control'],
    [
      'normal',
      'Si consideras que el tratamiento de tus datos personales no se ajusta a la normativa vigente, puedes presentar una reclamación ante la Agencia Española de Protección de Datos (www.aepd.es).'
    ]
  ],
  'pves'
);

const privacidadCasabellaEN = contenidoLegal(
  [
    ['h2', 'Data controller'],
    ['normal', 'Company name: [Legal name — to be completed]'],
    ['normal', 'Tax ID: [CIF — to be completed]'],
    ['normal', 'Address: Carrer de Pujades, 220, 08005 Barcelona, Spain'],
    ['normal', 'Email: hola@casabella.com'],
    ['normal', 'Phone: +34 933 09 12 45'],
    ['h2', 'Personal data we collect'],
    [
      'normal',
      'When you fill in the booking form or contact us by email, WhatsApp or phone, we collect the following data:'
    ],
    ['normal', '• Name'],
    ['normal', '• Phone number'],
    ['normal', '• Email (if you provide it)'],
    ['normal', '• Date, time and number of guests'],
    ['normal', '• Any additional notes you want to share (allergies, celebration, preferences)'],
    ['h2', 'Purpose of processing'],
    [
      'normal',
      'Your data is used exclusively to manage your reservation, confirm it, and communicate with you about your visit to the restaurant. It is not used for advertising nor shared with third parties for commercial purposes.'
    ],
    ['h2', 'Legal basis'],
    [
      'normal',
      'The legal basis for processing your data is your explicit consent when submitting the form or initiating contact through another channel (Article 6.1.a of the GDPR).'
    ],
    ['h2', 'Recipients of the data'],
    [
      'normal',
      'Your data is not shared with third parties. It is handled internally by Casabella staff in charge of reservations. Data would only be shared with public authorities when required by law.'
    ],
    ['h2', 'Data retention'],
    [
      'normal',
      'Data is kept only for the time strictly necessary to manage the reservation. Afterward it is deleted from our systems, unless there is a legal obligation to keep it for longer.'
    ],
    ['h2', 'Your rights'],
    ['normal', 'You can exercise the following rights at any time:'],
    ['normal', '• Access: know what data we hold about you.'],
    ['normal', '• Rectification: correct incorrect or incomplete data.'],
    ['normal', '• Erasure: delete your data.'],
    ['normal', '• Objection: object to processing.'],
    ['normal', '• Restriction: request restricted use.'],
    ['normal', '• Portability: receive your data in a structured format.'],
    [
      'normal',
      'To exercise any of these rights, write to hola@casabella.com attaching a copy of your ID or equivalent document.'
    ],
    ['h2', 'Complaints to the supervisory authority'],
    [
      'normal',
      'If you believe the processing of your personal data does not comply with current regulations, you can file a complaint with the Spanish Data Protection Agency (www.aepd.es).'
    ]
  ],
  'pven'
);

const cookiesCasabellaES = contenidoLegal(
  [
    ['h2', '¿Este sitio utiliza cookies?'],
    [
      'normal',
      'No. Este sitio web NO utiliza cookies personales, ni de tracking, ni de publicidad. Puedes navegar sin banners de consentimiento y sin ceder ningún dato de comportamiento.'
    ],
    ['h2', 'Analítica web con Cloudflare Web Analytics'],
    [
      'normal',
      'Usamos Cloudflare Web Analytics, una herramienta de analítica web que respeta la privacidad y NO utiliza cookies ni fingerprinting. Cloudflare mide únicamente métricas anónimas agregadas: número de visitas, páginas más vistas, países de origen (por IP anonimizada) y sitios que enlazan al nuestro. No identifica visitantes individuales, no crea perfiles, y no comparte datos con terceros.'
    ],
    ['normal', 'Puedes consultar más información en: https://www.cloudflare.com/web-analytics/'],
    ['h2', 'Almacenamiento local técnico'],
    [
      'normal',
      'Es posible que tu navegador guarde información técnica (localStorage) para recordar preferencias como el idioma seleccionado. Estos datos son estrictamente técnicos, se almacenan solo en tu dispositivo, y no se comparten con terceros ni se utilizan para tracking.'
    ],
    ['h2', 'Actualizaciones'],
    [
      'normal',
      'Si en el futuro incorporamos herramientas que utilicen cookies (por ejemplo, sistemas de reserva de terceros o marketing), actualizaremos esta política y añadiremos el banner de consentimiento correspondiente para cumplir con la normativa vigente.'
    ]
  ],
  'coes'
);

const cookiesCasabellaEN = contenidoLegal(
  [
    ['h2', 'Does this site use cookies?'],
    [
      'normal',
      'No. This website does NOT use personal, tracking, or advertising cookies. You can browse without consent banners and without sharing any behavior data.'
    ],
    ['h2', 'Web analytics with Cloudflare Web Analytics'],
    [
      'normal',
      'We use Cloudflare Web Analytics, a privacy-focused web analytics tool that does NOT use cookies nor fingerprinting. Cloudflare only measures anonymous aggregate metrics: number of visits, most viewed pages, countries of origin (via anonymized IP), and referring websites. It does not identify individual visitors, does not build profiles, and does not share data with third parties.'
    ],
    ['normal', 'More information at: https://www.cloudflare.com/web-analytics/'],
    ['h2', 'Technical local storage'],
    [
      'normal',
      'Your browser may store technical information (localStorage) to remember preferences such as the selected language. This data is strictly technical, stored only on your device, and is not shared with third parties nor used for tracking.'
    ],
    ['h2', 'Updates'],
    [
      'normal',
      'If in the future we incorporate tools that use cookies (for example, third-party reservation systems or marketing), we will update this policy and add the corresponding consent banner to comply with current regulations.'
    ]
  ],
  'coen'
);

const paginasLegalesCasabella = [
  {
    _id: 'paginaLegal-casabella-aviso-legal',
    _type: 'paginaLegal',
    restaurante: ref(ID.restauranteCasabella),
    tipo: 'aviso-legal',
    titulo: i18nStr('Aviso legal', 'Legal notice'),
    contenido: i18nPortable(avisoLegalCasabellaES, avisoLegalCasabellaEN),
    ultimaActualizacion: '2026-08-17',
    orden: 10
  },
  {
    _id: 'paginaLegal-casabella-privacidad',
    _type: 'paginaLegal',
    restaurante: ref(ID.restauranteCasabella),
    tipo: 'privacidad',
    titulo: i18nStr('Política de privacidad', 'Privacy policy'),
    contenido: i18nPortable(privacidadCasabellaES, privacidadCasabellaEN),
    ultimaActualizacion: '2026-08-17',
    orden: 20
  },
  {
    _id: 'paginaLegal-casabella-cookies',
    _type: 'paginaLegal',
    restaurante: ref(ID.restauranteCasabella),
    tipo: 'cookies',
    titulo: i18nStr('Política de cookies', 'Cookie policy'),
    contenido: i18nPortable(cookiesCasabellaES, cookiesCasabellaEN),
    ultimaActualizacion: '2026-08-17',
    orden: 30
  }
];

// Guixot reutiliza las mismas plantillas base — el cliente rellena `[COMPLETAR]`
// (CIF/NIF/titular/dirección fiscal) desde Sanity Studio para cada restaurante.
const paginasLegalesGuixot = [
  {
    _id: 'paginaLegal-guixot-aviso-legal',
    _type: 'paginaLegal',
    restaurante: ref(ID.restauranteGuixot),
    tipo: 'aviso-legal',
    titulo: i18nStr('Aviso legal', 'Legal notice'),
    contenido: i18nPortable(avisoLegalCasabellaES, avisoLegalCasabellaEN),
    ultimaActualizacion: '2026-08-19',
    orden: 10
  },
  {
    _id: 'paginaLegal-guixot-privacidad',
    _type: 'paginaLegal',
    restaurante: ref(ID.restauranteGuixot),
    tipo: 'privacidad',
    titulo: i18nStr('Política de privacidad', 'Privacy policy'),
    contenido: i18nPortable(privacidadCasabellaES, privacidadCasabellaEN),
    ultimaActualizacion: '2026-08-19',
    orden: 20
  },
  {
    _id: 'paginaLegal-guixot-cookies',
    _type: 'paginaLegal',
    restaurante: ref(ID.restauranteGuixot),
    tipo: 'cookies',
    titulo: i18nStr('Política de cookies', 'Cookie policy'),
    contenido: i18nPortable(cookiesCasabellaES, cookiesCasabellaEN),
    ultimaActualizacion: '2026-08-19',
    orden: 30
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// GUIXOT — Sant Andreu · cocina catalana tradicional de guisos (mocks)
// ─────────────────────────────────────────────────────────────────────────────

const HORARIOS_GUIXOT_MA_SA = [
  { _key: 't1', _type: 'turno', apertura: '13:00', cierre: '16:00' },
  { _key: 't2', _type: 'turno', apertura: '20:30', cierre: '23:30' }
];

const restauranteGuixot = {
  _id: ID.restauranteGuixot,
  _type: 'restaurante',
  nombre: 'Guixot',
  slug: { _type: 'slug', current: 'guixot' },
  dominio: 'https://guixot.cat',
  colorMarca: '#c85a3b',
  idiomaPorDefecto: ref(ID.idiomaEs),
  idiomasActivos: [
    { _key: 'la-es', ...ref(ID.idiomaEs) },
    { _key: 'la-en', ...ref(ID.idiomaEn) }
  ],
  heroTitulo: i18nStr('Cuina de guisos', 'Slow-cooked cuisine'),
  heroSubtitulo: i18nStr('a Sant Andreu', 'in Sant Andreu'),
  heroMetaIzq: i18nStr('Cocina tradicional catalana', 'Traditional Catalan cooking'),
  heroMetaDer: i18nStr('Barcelona · Sant Andreu', 'Barcelona · Sant Andreu'),
  heroNota: i18nTxt(
    'Cocina abierta de martes a sábado.\nComidas y cenas al calor de la lumbre.',
    'Kitchen open Tuesday to Saturday.\nLunches and dinners by the fire.'
  ),
  heroCta: i18nStr('Reservar mesa', 'Book a table'),
  manifiestoEyebrow: i18nStr('Guixot · ollas al fuego', 'Guixot · pots on the fire'),
  manifiestoTexto: i18nTxt(
    'Recetas de la abuela hechas al calor de la lumbre. Sin prisa, con producto del barrio.',
    "Grandmother's recipes cooked slowly by the fire. No rush, with produce from the neighbourhood."
  ),
  sobreEyebrow: i18nStr('Sobre Guixot', 'About Guixot'),
  sobreTitulo: i18nStr('Cocina que se cuenta con cuchara', 'Cuisine that needs a spoon'),
  sobreCuerpo: i18nRich(
    [
      'Guixot nació con una idea muy simple: cocinar como se cocinaba en casa. Ollas al fuego, guisos que piden su tiempo, producto de mercado, y una sala donde la sobremesa vale tanto como el plato.',
      'El equipo lo forma una familia de tres generaciones de Sant Andreu. Cocinamos lo que aprendimos de nuestras abuelas, con la técnica que hemos ido puliendo en el camino. Nada de espectáculos: solo comida honesta y bien hecha.'
    ],
    [
      'Guixot was born with a very simple idea: to cook the way we used to cook at home. Pots on the fire, stews that take their time, market produce, and a dining room where the after-meal chat matters as much as the food.',
      "Our team is a family of three generations from Sant Andreu. We cook what our grandmothers taught us, with technique we've polished along the way. No show: just honest food, done right."
    ]
  ),
  gruposEyebrow: i18nStr('Encuentros y celebraciones', 'Gatherings & celebrations'),
  gruposTitulo: i18nStr('Comer juntos, la mejor forma', 'Eating together, the best way'),
  gruposCta: i18nStr('Consultar', 'Enquire'),
  horariosTitulo: i18nStr('Ven cuando quieras', 'Come whenever you like'),
  horariosTexto: i18nTxt(
    'Martes a sábado, 13:00–16:00 y 20:30–23:30. Domingos y lunes, cerrado.',
    'Tuesday to Saturday, 13:00–16:00 and 20:30–23:30. Sundays and Mondays, closed.'
  ),
  horariosAbierto: i18nStr('Estamos abiertos hasta las {hora}.', 'Open now until {hora}.'),
  horariosProximaApertura: i18nStr('Hoy abrimos a las {hora}.', 'Opens today at {hora}.'),
  horariosCerrado: i18nStr('Hoy no abrimos. Nos vemos mañana.', 'Closed today. See you tomorrow.'),
  horariosSemana: [
    { _key: 'd1', _type: 'diaHorario', dia: 'Mo', turnos: [] },
    { _key: 'd2', _type: 'diaHorario', dia: 'Tu', turnos: HORARIOS_GUIXOT_MA_SA },
    { _key: 'd3', _type: 'diaHorario', dia: 'We', turnos: HORARIOS_GUIXOT_MA_SA },
    { _key: 'd4', _type: 'diaHorario', dia: 'Th', turnos: HORARIOS_GUIXOT_MA_SA },
    { _key: 'd5', _type: 'diaHorario', dia: 'Fr', turnos: HORARIOS_GUIXOT_MA_SA },
    { _key: 'd6', _type: 'diaHorario', dia: 'Sa', turnos: HORARIOS_GUIXOT_MA_SA },
    { _key: 'd7', _type: 'diaHorario', dia: 'Su', turnos: [] }
  ],
  direccion: {
    calle: 'Carrer Gran de Sant Andreu, 200',
    codigoPostal: '08030',
    ciudad: 'Barcelona',
    provincia: 'Barcelona',
    barrio: 'Sant Andreu',
    pais: 'ES'
  },
  contacto: { telefono: '+34 933 45 67 89', email: 'hola@guixot.cat' },
  redes: { instagram: 'https://www.instagram.com/guixot.bcn' },
  ...crearTextosUiMock('hola@guixot.cat', '+34 933 45 67 89'),
  seoTitulo: i18nStr(
    'Guixot — Cocina de guisos en Sant Andreu, Barcelona',
    'Guixot — Slow-cooked cuisine in Sant Andreu, Barcelona'
  ),
  seoDescripcion: i18nTxt(
    'Cocina catalana de guisos hechos al fuego bajo. Recetas de siempre, producto de mercado, sobremesas largas en Sant Andreu.',
    'Catalan slow-cooked cuisine over low fire. Timeless recipes, market produce, long after-meals in Sant Andreu.'
  )
};

const categoriasVinoGuixot = [
  { _id: ID.catVinoGuixot.blancos, nombre: ['Blancos', 'Whites'], orden: 10 },
  { _id: ID.catVinoGuixot.tintos, nombre: ['Tintos', 'Reds'], orden: 20 },
  { _id: ID.catVinoGuixot.rosados, nombre: ['Rosados', 'Rosés'], orden: 30 }
].map(c => ({
  _id: c._id,
  _type: 'categoriaVino',
  restaurante: ref(ID.restauranteGuixot),
  nombre: i18nStr(c.nombre[0], c.nombre[1]),
  orden: c.orden
}));

const vinosGuixot = [
  {
    catId: ID.catVinoGuixot.blancos,
    nombre: 'Xarel·lo Ancestral 2023',
    region: 'Penedès',
    nota: ['Fresco, cítrico, sin filtrar', 'Fresh, citrus, unfiltered'],
    copa: 6,
    botella: 28
  },
  {
    catId: ID.catVinoGuixot.blancos,
    nombre: 'Verdejo de Rueda 2023',
    region: 'Rueda',
    nota: ['Herbáceo, ligero', 'Herbal, light'],
    copa: 6,
    botella: 26
  },
  {
    catId: ID.catVinoGuixot.blancos,
    nombre: 'Godello Bierzo 2023',
    region: 'Bierzo',
    nota: ['Mineral, longitud', 'Mineral, long finish'],
    copa: 7,
    botella: 32
  },
  {
    catId: ID.catVinoGuixot.tintos,
    nombre: 'Garnacha del Camp 2022',
    region: 'Camp de Tarragona',
    nota: ['Fruta madura, casero', 'Ripe fruit, homey'],
    copa: 6,
    botella: 28
  },
  {
    catId: ID.catVinoGuixot.tintos,
    nombre: 'Somontano Reserva 2020',
    region: 'Somontano',
    nota: ['Rústico, corpóreo', 'Rustic, full-bodied'],
    copa: 8,
    botella: 38
  },
  {
    catId: ID.catVinoGuixot.tintos,
    nombre: 'Priorat Vell 2019',
    region: 'Priorat',
    nota: ['Piedra, cereza, garriga', 'Stone, cherry, garrigue'],
    copa: 10,
    botella: 48
  },
  {
    catId: ID.catVinoGuixot.rosados,
    nombre: 'Rosat de Terra 2023',
    region: 'Empordà',
    nota: ['Suave, fresco, floral', 'Soft, fresh, floral'],
    copa: 6,
    botella: 26
  }
].map((v, i) => ({
  _id: `vino-guixot-${i + 1}`,
  _type: 'vino',
  restaurante: ref(ID.restauranteGuixot),
  categoria: ref(v.catId),
  nombre: v.nombre,
  region: v.region,
  nota: i18nTxt(v.nota[0], v.nota[1]),
  precioCopa: v.copa,
  precioBotella: v.botella,
  orden: (i + 1) * 10,
  activo: true
}));

const categoriasPlatoGuixot = [
  { _id: ID.catPlatoGuixot.entrantes, nombre: ['Entrantes', 'Starters'], orden: 10 },
  { _id: ID.catPlatoGuixot.guisos, nombre: ['Guisos', 'Slow-cooked mains'], orden: 20 },
  { _id: ID.catPlatoGuixot.postres, nombre: ['Postres', 'Desserts'], orden: 30 }
].map(c => ({
  _id: c._id,
  _type: 'categoriaPlato',
  restaurante: ref(ID.restauranteGuixot),
  nombre: i18nStr(c.nombre[0], c.nombre[1]),
  orden: c.orden
}));

const platosGuixot = [
  {
    catId: ID.catPlatoGuixot.entrantes,
    nombre: ['Pa amb tomàquet', 'Pan con tomate'],
    nota: ['Recién frotado, aceite virgen extra', 'Freshly rubbed, extra virgin olive oil'],
    precio: 4
  },
  {
    catId: ID.catPlatoGuixot.entrantes,
    nombre: ['Amanida catalana', 'Catalan salad'],
    nota: ['La ensalada de la casa, embutido y huevo', 'The house salad, cured meats and egg'],
    precio: 10
  },
  {
    catId: ID.catPlatoGuixot.entrantes,
    nombre: ['Fideuà de bacallà', 'Cod fideuà'],
    nota: ['Con alioli suave de miel', 'With soft honey aioli'],
    precio: 12
  },
  {
    catId: ID.catPlatoGuixot.guisos,
    nombre: ["Escudella i carn d'olla", 'Escudella catalana'],
    nota: ['Solo domingos. Clásico irrenunciable', 'Sundays only. A must-have classic'],
    precio: 18
  },
  {
    catId: ID.catPlatoGuixot.guisos,
    nombre: ['Estofat de vedella', 'Beef stew'],
    nota: [
      'Ocho horas al fuego bajo, verduras del huerto',
      'Eight hours slow-cooked, garden vegetables'
    ],
    precio: 20
  },
  {
    catId: ID.catPlatoGuixot.guisos,
    nombre: ['Bacallà a la llauna', 'Cod al horno tradicional'],
    nota: ['Con legumbres, tomate confitado y ajo', 'With legumes, confit tomato and garlic'],
    precio: 22
  },
  {
    catId: ID.catPlatoGuixot.guisos,
    nombre: ['Peus de porc amb bolets', 'Pig trotters with mushrooms'],
    nota: ['Solo para valientes. Salsa densa, rústica', 'Only for the brave. Rich, rustic sauce'],
    precio: 18
  },
  {
    catId: ID.catPlatoGuixot.postres,
    nombre: ['Crema catalana', 'Crema catalana'],
    nota: ['Requemada delante de ti', 'Torched in front of you'],
    precio: 6
  },
  {
    catId: ID.catPlatoGuixot.postres,
    nombre: ['Mel i mató', 'Honey and fresh cheese'],
    nota: ['Miel de romero, mató del Montseny', 'Rosemary honey, fresh cheese from Montseny'],
    precio: 6
  }
].map((p, i) => ({
  _id: `plato-guixot-${i + 1}`,
  _type: 'plato',
  restaurante: ref(ID.restauranteGuixot),
  categoria: ref(p.catId),
  nombre: i18nStr(p.nombre[0], p.nombre[1]),
  nota: i18nTxt(p.nota[0], p.nota[1]),
  precio: p.precio,
  orden: (i + 1) * 10,
  activo: true
}));

// ─────────────────────────────────────────────────────────────────────────────
// ROURE — El Born · cocina catalana de arraigo con bodega curada (mocks)
// ─────────────────────────────────────────────────────────────────────────────

const HORARIOS_ROURE_MA_SA = [
  { _key: 't1', _type: 'turno', apertura: '13:00', cierre: '16:00' },
  { _key: 't2', _type: 'turno', apertura: '20:00', cierre: '23:30' }
];

const restauranteRoure = {
  _id: ID.restauranteRoure,
  _type: 'restaurante',
  nombre: 'Roure',
  slug: { _type: 'slug', current: 'roure' },
  dominio: 'https://roure.cat',
  colorMarca: '#2b3d2c',
  idiomaPorDefecto: ref(ID.idiomaEs),
  idiomasActivos: [
    { _key: 'la-es', ...ref(ID.idiomaEs) },
    { _key: 'la-en', ...ref(ID.idiomaEn) }
  ],
  heroTitulo: i18nStr('Cocina de arraigo.', 'Rooted cuisine.'),
  heroSubtitulo: i18nStr('Un roble en el Born.', 'An oak in El Born.'),
  heroMetaIzq: i18nStr('Restaurante y bodega', 'Restaurant & wine cellar'),
  heroMetaDer: i18nStr('El Born · Barcelona', 'El Born · Barcelona'),
  heroNota: i18nTxt(
    'Cocina abierta de martes a sábado.\nComidas, cenas y sobremesas largas.',
    'Kitchen open Tuesday to Saturday.\nLunches, dinners and long afterthoughts.'
  ),
  heroCta: i18nStr('Reservar mesa', 'Book a table'),
  manifiestoEyebrow: i18nStr('Roure · El Born', 'Roure · El Born'),
  manifiestoTexto: i18nTxt(
    'Cocina catalana con hondura. Producto, técnica y una bodega hecha con calma.',
    'Catalan cuisine with depth. Produce, technique, and a wine cellar built patiently.'
  ),
  sobreEyebrow: i18nStr('Nuestra historia', 'Our story'),
  sobreTitulo: i18nStr('Un roble en el Born', 'An oak in El Born'),
  sobreCuerpo: i18nRich(
    [
      'Roure abrió las puertas en 2016 con una idea sencilla: devolver a la cocina catalana la dignidad de la sobremesa. Los guisos vuelven a la olla, los pescados vuelven al fuego bajo, y la carta cambia con lo que trae cada semana el Mercat de Santa Caterina.',
      'Detrás hay un equipo curtido en restaurantes de Cataluña y del sur de Francia. Servimos comida hecha con respeto y una bodega que se ha ido construyendo botella a botella, con paciencia. Como el roble: sin prisa, con raíz.'
    ],
    [
      'Roure opened in 2016 with a simple idea: to bring dignity back to Catalan cuisine and long afternoons at the table. Stews return to the pot, fish returns to the slow fire, and the menu shifts weekly with whatever comes from the Mercat de Santa Caterina.',
      'Behind it, a team seasoned in kitchens from Catalonia and southern France. We serve food made with respect and a wine cellar built bottle by bottle, patiently. Like the oak: unhurried, rooted.'
    ]
  ),
  gruposEyebrow: i18nStr('Grupos y celebraciones', 'Groups & celebrations'),
  gruposTitulo: i18nStr('La sala entera para ti', 'The whole room for you'),
  gruposCta: i18nStr('Consultar', 'Enquire'),
  horariosTitulo: i18nStr('Cuando quieras', 'Whenever you like'),
  horariosTexto: i18nTxt(
    'Martes a sábado, 13:00–16:00 y 20:00–23:30. Domingos y lunes, cerrado.',
    'Tuesday to Saturday, 13:00–16:00 and 20:00–23:30. Sundays and Mondays, closed.'
  ),
  horariosAbierto: i18nStr('Estamos abiertos hasta las {hora}.', 'Open now until {hora}.'),
  horariosProximaApertura: i18nStr('Hoy abrimos a las {hora}.', 'Opens today at {hora}.'),
  horariosCerrado: i18nStr('Hoy no abrimos. Nos vemos mañana.', 'Closed today. See you tomorrow.'),
  horariosSemana: [
    { _key: 'd1', _type: 'diaHorario', dia: 'Mo', turnos: [] },
    { _key: 'd2', _type: 'diaHorario', dia: 'Tu', turnos: HORARIOS_ROURE_MA_SA },
    { _key: 'd3', _type: 'diaHorario', dia: 'We', turnos: HORARIOS_ROURE_MA_SA },
    { _key: 'd4', _type: 'diaHorario', dia: 'Th', turnos: HORARIOS_ROURE_MA_SA },
    { _key: 'd5', _type: 'diaHorario', dia: 'Fr', turnos: HORARIOS_ROURE_MA_SA },
    { _key: 'd6', _type: 'diaHorario', dia: 'Sa', turnos: HORARIOS_ROURE_MA_SA },
    { _key: 'd7', _type: 'diaHorario', dia: 'Su', turnos: [] }
  ],
  direccion: {
    calle: 'Passeig del Born, 30',
    codigoPostal: '08003',
    ciudad: 'Barcelona',
    provincia: 'Barcelona',
    barrio: 'El Born',
    pais: 'ES'
  },
  contacto: { telefono: '+34 933 21 45 67', email: 'hola@roure.cat' },
  redes: { instagram: 'https://www.instagram.com/roure.bcn' },
  ...crearTextosUiMock('hola@roure.cat', '+34 933 21 45 67'),
  seoTitulo: i18nStr(
    'Roure — Cocina catalana de arraigo en El Born, Barcelona',
    'Roure — Rooted Catalan cuisine in El Born, Barcelona'
  ),
  seoDescripcion: i18nTxt(
    'Restaurante y bodega en el corazón de El Born. Cocina catalana contemporánea con producto de mercado y vinos curados con calma.',
    'Restaurant and wine cellar in the heart of El Born. Contemporary Catalan cuisine with market produce and a patiently curated wine list.'
  )
};

const categoriasVinoRoure = [
  { _id: ID.catVinoRoure.naturales, nombre: ['Naturales', 'Natural wines'], orden: 10 },
  { _id: ID.catVinoRoure.blancos, nombre: ['Blancos', 'Whites'], orden: 20 },
  { _id: ID.catVinoRoure.tintos, nombre: ['Tintos', 'Reds'], orden: 30 }
].map(c => ({
  _id: c._id,
  _type: 'categoriaVino',
  restaurante: ref(ID.restauranteRoure),
  nombre: i18nStr(c.nombre[0], c.nombre[1]),
  orden: c.orden
}));

const vinosRoure = [
  {
    catId: ID.catVinoRoure.naturales,
    nombre: 'Ancestral Xarel·lo Vell 2023',
    region: 'Penedès',
    nota: ['Nublado, floral, sin filtrar', 'Cloudy, floral, unfiltered'],
    copa: 8,
    botella: 36
  },
  {
    catId: ID.catVinoRoure.naturales,
    nombre: 'Trepat de Conca 2022',
    region: 'Conca de Barberà',
    nota: ['Ligero, granate, con nervio', 'Light, garnet, tense'],
    copa: 9,
    botella: 40
  },
  {
    catId: ID.catVinoRoure.blancos,
    nombre: 'Verdejo Rueda 2023',
    region: 'Rueda',
    nota: ['Hierba fresca, salino', 'Fresh grass, saline'],
    copa: 7,
    botella: 32
  },
  {
    catId: ID.catVinoRoure.blancos,
    nombre: 'Riesling Mosel 2022',
    region: 'Mosel',
    nota: ['Fruta blanca, acidez viva', 'White fruit, bright acidity'],
    copa: 9,
    botella: 42
  },
  {
    catId: ID.catVinoRoure.tintos,
    nombre: 'Priorat Vell 2020',
    region: 'Priorat',
    nota: ['Piedra, ciruela madura', 'Stone, ripe plum'],
    copa: 12,
    botella: 56
  },
  {
    catId: ID.catVinoRoure.tintos,
    nombre: 'Tempranillo Ribera 2021',
    region: 'Ribera del Duero',
    nota: ['Roble fino, corpóreo', 'Fine oak, full-bodied'],
    copa: 10,
    botella: 48
  },
  {
    catId: ID.catVinoRoure.tintos,
    nombre: 'Bierzo Mencía 2022',
    region: 'Bierzo',
    nota: ['Ligero, mineral, elegante', 'Light, mineral, elegant'],
    copa: 9,
    botella: 42
  },
  {
    catId: ID.catVinoRoure.tintos,
    nombre: "Nero d'Avola 2022",
    region: 'Sicilia',
    nota: ['Fruta oscura, especias', 'Dark fruit, spice'],
    copa: 9,
    botella: 40
  }
].map((v, i) => ({
  _id: `vino-roure-${i + 1}`,
  _type: 'vino',
  restaurante: ref(ID.restauranteRoure),
  categoria: ref(v.catId),
  nombre: v.nombre,
  region: v.region,
  nota: i18nTxt(v.nota[0], v.nota[1]),
  precioCopa: v.copa,
  precioBotella: v.botella,
  orden: (i + 1) * 10,
  activo: true
}));

const categoriasPlatoRoure = [
  { _id: ID.catPlatoRoure.empezar, nombre: ['Para empezar', 'To begin'], orden: 10 },
  { _id: ID.catPlatoRoure.principales, nombre: ['Principales', 'Mains'], orden: 20 },
  { _id: ID.catPlatoRoure.postres, nombre: ['Postres', 'Desserts'], orden: 30 }
].map(c => ({
  _id: c._id,
  _type: 'categoriaPlato',
  restaurante: ref(ID.restauranteRoure),
  nombre: i18nStr(c.nombre[0], c.nombre[1]),
  orden: c.orden
}));

const platosRoure = [
  {
    catId: ID.catPlatoRoure.empezar,
    nombre: ['Pan de payés y aceite', 'Country bread and olive oil'],
    nota: ['Con anchoas de la Escala', 'With Escala anchovies'],
    precio: 6
  },
  {
    catId: ID.catPlatoRoure.empezar,
    nombre: ['Bombas de la Barceloneta', 'Barceloneta bombas'],
    nota: ['Con brava y alioli suave', 'With brava sauce and soft aioli'],
    precio: 9
  },
  {
    catId: ID.catPlatoRoure.empezar,
    nombre: ['Croquetas de picantón', 'Poussin croquettes'],
    nota: ['Recién hechas, cremosas', 'Just fried, creamy inside'],
    precio: 8
  },
  {
    catId: ID.catPlatoRoure.principales,
    nombre: ['Arroz de conejo y setas', 'Rabbit and mushroom rice'],
    nota: ['Para dos, seco al horno', 'For two, oven-dried'],
    precio: 22
  },
  {
    catId: ID.catPlatoRoure.principales,
    nombre: ['Cazuela de rape con almejas', 'Monkfish and clam casserole'],
    nota: ['Salsa verde de la casa', 'House green sauce'],
    precio: 24
  },
  {
    catId: ID.catPlatoRoure.principales,
    nombre: ['Costilla de ternera 12h', '12-hour beef rib'],
    nota: ['Puré rústico, jugo propio', 'Rustic mash, own juices'],
    precio: 26
  },
  {
    catId: ID.catPlatoRoure.principales,
    nombre: ['Bacalao confitado con puerros', 'Confit cod with leeks'],
    nota: ['Del Rosellón, alioli tibio', 'From Rosellón, warm aioli'],
    precio: 21
  },
  {
    catId: ID.catPlatoRoure.postres,
    nombre: ['Torrija caramelizada', 'Caramelized torrija'],
    nota: ['Con helado de canela', 'With cinnamon ice cream'],
    precio: 8
  },
  {
    catId: ID.catPlatoRoure.postres,
    nombre: ['Chocolate y aceite de arbequina', 'Chocolate and arbequina oil'],
    nota: ['Con sal en escamas', 'With flaky salt'],
    precio: 7
  }
].map((p, i) => ({
  _id: `plato-roure-${i + 1}`,
  _type: 'plato',
  restaurante: ref(ID.restauranteRoure),
  categoria: ref(p.catId),
  nombre: i18nStr(p.nombre[0], p.nombre[1]),
  nota: i18nTxt(p.nota[0], p.nota[1]),
  precio: p.precio,
  orden: (i + 1) * 10,
  activo: true
}));

// ─────────────────────────────────────────────────────────────────────────────
// Ejecución
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🧹 Borrando docs existentes de tipos', TIPOS.join(', '), '…');
  const existentes = await client.fetch<{ _id: string }[]>(`*[_type in $tipos]{_id}`, {
    tipos: TIPOS
  });
  if (existentes.length > 0) {
    const tx = client.transaction();
    existentes.forEach(d => tx.delete(d._id));
    existentes.forEach(d => tx.delete(`drafts.${d._id}`));
    await tx.commit({ visibility: 'async' });
    console.log(`   → ${existentes.length} docs borrados`);
  } else {
    console.log('   → No había docs previos');
  }

  console.log('🌐 Creando idiomas…');
  await client.createOrReplace({
    _id: ID.idiomaEs,
    _type: 'idioma',
    codigo: 'es',
    nombre: 'Español'
  });
  await client.createOrReplace({
    _id: ID.idiomaEn,
    _type: 'idioma',
    codigo: 'en',
    nombre: 'English'
  });

  console.log('🍽 Creando restaurante La Pubilla…');
  await client.createOrReplace(restaurantePubilla as never);
  for (const c of categoriasVinoPubilla) await client.createOrReplace(c as never);
  for (const v of vinosPubilla) await client.createOrReplace(v as never);
  for (const c of categoriasPlatoPubilla) await client.createOrReplace(c as never);
  for (const p of platosPubilla) await client.createOrReplace(p as never);

  console.log('🍽 Creando restaurante La Principal…');
  await client.createOrReplace(restauranteLaPrincipal as never);
  for (const c of categoriasVinoPrincipal) await client.createOrReplace(c as never);
  for (const v of vinosPrincipal) await client.createOrReplace(v as never);
  for (const c of categoriasPlatoPrincipal) await client.createOrReplace(c as never);
  for (const p of platosPrincipal) await client.createOrReplace(p as never);

  console.log('🍽 Creando restaurante Casabella…');
  await client.createOrReplace(restauranteCasabella as never);
  for (const c of categoriasVinoCasabella) await client.createOrReplace(c as never);
  for (const v of vinosCasabella) await client.createOrReplace(v as never);
  for (const c of categoriasPlatoCasabella) await client.createOrReplace(c as never);
  for (const p of platosCasabella) await client.createOrReplace(p as never);
  console.log('⚖️  Creando páginas legales Casabella…');
  for (const pl of paginasLegalesCasabella) await client.createOrReplace(pl as never);

  console.log('🍽 Creando restaurante Guixot…');
  await client.createOrReplace(restauranteGuixot as never);
  for (const c of categoriasVinoGuixot) await client.createOrReplace(c as never);
  for (const v of vinosGuixot) await client.createOrReplace(v as never);
  for (const c of categoriasPlatoGuixot) await client.createOrReplace(c as never);
  for (const p of platosGuixot) await client.createOrReplace(p as never);
  console.log('⚖️  Creando páginas legales Guixot…');
  for (const pl of paginasLegalesGuixot) await client.createOrReplace(pl as never);

  console.log('🍽 Creando restaurante Roure…');
  await client.createOrReplace(restauranteRoure as never);
  for (const c of categoriasVinoRoure) await client.createOrReplace(c as never);
  for (const v of vinosRoure) await client.createOrReplace(v as never);
  for (const c of categoriasPlatoRoure) await client.createOrReplace(c as never);
  for (const p of platosRoure) await client.createOrReplace(p as never);

  console.log('\n✅ Seed completado.');
  console.log(`   Idiomas:       2 (es, en)`);
  console.log(`   Restaurantes:  5 (La Pubilla, La Principal, Casabella, Guixot, Roure)`);
  console.log(
    `   Vinos:         ${vinosPubilla.length} + ${vinosPrincipal.length} + ${vinosCasabella.length} + ${vinosGuixot.length} + ${vinosRoure.length}`
  );
  console.log(
    `   Platos:        ${platosPubilla.length} + ${platosPrincipal.length} + ${platosCasabella.length} + ${platosGuixot.length} + ${platosRoure.length}`
  );
  console.log('\n   Recarga el Studio (Ctrl+R) para ver el contenido.');
  console.log('   Las imágenes hay que subirlas manualmente desde el Studio.');
}

main().catch(err => {
  console.error('❌ Error en seed:', err);
  process.exit(1);
});
