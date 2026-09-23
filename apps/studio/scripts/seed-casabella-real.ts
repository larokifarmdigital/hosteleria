/**
 * Seed específico y NO DESTRUCTIVO para el restaurante real Casabella
 * (Carrer de Montserrat, 15 · El Raval · Barcelona).
 *
 * A diferencia de `seed.ts` (que borra todo el dataset y lo repuebla), este
 * script usa `patch().set()` sobre los docs existentes de Casabella, por lo que:
 *   - No toca los otros restaurantes (Pubilla, Principal, Guixot, Roure, Ocaña)
 *   - No toca la carta (categoriaPlato / plato / vino) — el cliente la edita
 *   - Preserva las imágenes ya subidas (heroImagen, galeria, sobreImagenes, logo…)
 *     porque `patch().set()` solo sobrescribe los campos que le pasamos.
 *
 * Actualiza el contenido a la realidad del negocio:
 *   - Bar-restaurante tradicional con 30 años (fundado ~1994)
 *   - Cocina catalana y española casera
 *   - Ubicación: El Raval, no Poblenou como estaba en el mock viejo
 *   - Horario continuo 07:00 (o 08:00 fines de semana) → 23:30 (cierre cocina)
 *   - Reservas desactivadas (aceptaReservas: false)
 *   - Instagram: @restaurante.casabella
 *   - Idiomas activos: es, ca, en
 *
 * Ejecutar:
 *   pnpm --filter studio run seed:casabella
 *
 * NOTA: assume que `restaurante-casabella` y `espacio-casabella` YA EXISTEN.
 * Si no existen (dataset limpio), ejecuta antes `pnpm --filter studio run seed`.
 */
import { getCliClient } from 'sanity/cli';

const client = getCliClient();

// ─────────────────────────────────────────────────────────────────────────────
// IDs (deben coincidir con los del seed principal)
// ─────────────────────────────────────────────────────────────────────────────
const RESTAURANTE_ID = 'restaurante-casabella';
const ESPACIO_ID = 'espacio-casabella';
const IDIOMA_ES = 'idioma-es';
const IDIOMA_CA = 'idioma-ca';
const IDIOMA_EN = 'idioma-en';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers i18n (3 idiomas: es, ca, en)
// ─────────────────────────────────────────────────────────────────────────────
type I18nEntry = { _key: string; _type: string; value: unknown };

function i18nStr(es: string, ca: string, en: string): I18nEntry[] {
  return [
    { _key: 'es', _type: 'internationalizedArrayStringValue', value: es },
    { _key: 'ca', _type: 'internationalizedArrayStringValue', value: ca },
    { _key: 'en', _type: 'internationalizedArrayStringValue', value: en }
  ];
}

function i18nTxt(es: string, ca: string, en: string): I18nEntry[] {
  return [
    { _key: 'es', _type: 'internationalizedArrayTextValue', value: es },
    { _key: 'ca', _type: 'internationalizedArrayTextValue', value: ca },
    { _key: 'en', _type: 'internationalizedArrayTextValue', value: en }
  ];
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

function i18nRich(es: string[], ca: string[], en: string[]): I18nEntry[] {
  return [
    {
      _key: 'es',
      _type: 'internationalizedArrayPortableTextValue',
      value: es.map((t, i) => bloque(t, `es${i}`))
    },
    {
      _key: 'ca',
      _type: 'internationalizedArrayPortableTextValue',
      value: ca.map((t, i) => bloque(t, `ca${i}`))
    },
    {
      _key: 'en',
      _type: 'internationalizedArrayPortableTextValue',
      value: en.map((t, i) => bloque(t, `en${i}`))
    }
  ];
}

function ref(id: string) {
  return { _type: 'reference', _ref: id };
}

// ─────────────────────────────────────────────────────────────────────────────
// Horarios (mismo turno continuo cada día; sábado y domingo abren a las 08:00)
// ─────────────────────────────────────────────────────────────────────────────
const TURNO_LV = [{ _key: 't1', _type: 'turno', apertura: '07:00', cierre: '23:30' }];
const TURNO_SD = [{ _key: 't1', _type: 'turno', apertura: '08:00', cierre: '23:30' }];

const HORARIOS_SEMANA = [
  { _key: 'd1', _type: 'diaHorario', dia: 'Mo', turnos: TURNO_LV },
  { _key: 'd2', _type: 'diaHorario', dia: 'Tu', turnos: TURNO_LV },
  { _key: 'd3', _type: 'diaHorario', dia: 'We', turnos: TURNO_LV },
  { _key: 'd4', _type: 'diaHorario', dia: 'Th', turnos: TURNO_LV },
  { _key: 'd5', _type: 'diaHorario', dia: 'Fr', turnos: TURNO_LV },
  { _key: 'd6', _type: 'diaHorario', dia: 'Sa', turnos: TURNO_SD },
  { _key: 'd7', _type: 'diaHorario', dia: 'Su', turnos: TURNO_SD }
];

// ─────────────────────────────────────────────────────────────────────────────
// Campos del RESTAURANTE (nivel marca — datos globales, sin heroX/manifiesto)
// ─────────────────────────────────────────────────────────────────────────────
const camposRestaurante = {
  nombre: 'Casabella',
  slug: { _type: 'slug', current: 'casabella' },
  dominio: 'https://restaurantcasabella.com',
  idiomaPorDefecto: ref(IDIOMA_ES),
  idiomasActivos: [
    { _key: 'la-es', ...ref(IDIOMA_ES) },
    { _key: 'la-ca', ...ref(IDIOMA_CA) },
    { _key: 'la-en', ...ref(IDIOMA_EN) }
  ],

  // Relación bidireccional restaurante ↔ espacio. Sin esta ref, fetchRestaurantData
  // lanza "Restaurante 'casabella' no tiene ningún espacio asociado".
  espacios: [{ _key: 'esp-casabella', ...ref(ESPACIO_ID) }],

  // Dirección real
  direccion: {
    calle: 'Carrer de Montserrat, 15',
    codigoPostal: '08001',
    ciudad: 'Barcelona',
    provincia: 'Barcelona',
    barrio: 'El Raval',
    pais: 'ES'
  },

  // Contacto (email pendiente — el cliente lo pondrá desde el Studio)
  contacto: {
    telefono: '+34 933 18 24 59'
    // email y whatsapp intencionalmente omitidos
  },

  // Redes (solo Instagram)
  mostrarRedes: true,
  redes: {
    instagram: 'https://www.instagram.com/restaurante.casabella'
  },

  // Reservas desactivadas (el CTA cae en cascada al teléfono)
  aceptaReservas: false,

  // Precio + servicios
  precioMedio: 15,
  formasPago: ['cash', 'credit_card', 'debit_card', 'contactless', 'bizum'],
  serviciosExtras: [
    'bar',
    'menu_dia',
    'grupos',
    'terraza',
    'familiar',
    'accesible',
    'vegetariano'
  ],

  // Sobre nosotros
  sobreEyebrow: i18nStr('Sobre Casabella', 'Sobre Casabella', 'About Casabella'),
  sobreTitulo: i18nStr(
    'Un bar del Raval con historia',
    'Un bar del Raval amb història',
    'A neighborhood bar with history'
  ),
  sobreCuerpo: i18nRich(
    [
      'Casabella lleva más de treinta años en el mismo local del Carrer de Montserrat, a un paso de La Rambla. Un bar-restaurante de barrio donde se desayuna, se come el menú del día, se tapea a media tarde y se cena sin prisa.',
      'La cocina es la de siempre: tapas de toda la vida, tortillas hechas al momento, croquetas caseras, arroces, guisos y pescado del día. La receta no ha cambiado porque no hace falta.',
      'Aquí caben los vecinos, los que trabajan en la zona al mediodía y quienes buscan un rincón auténtico lejos del bullicio de las Ramblas.'
    ],
    [
      "Casabella fa més de trenta anys al mateix local del Carrer de Montserrat, a un pas de La Rambla. Un bar-restaurant de barri on s'esmorza, es dina el menú del dia, es fa un tastet a mig matí i es sopa sense pressa.",
      'La cuina és la de sempre: tapes de tota la vida, truites fetes al moment, croquetes casolanes, arrossos, guisats i peix del dia. La recepta no ha canviat perquè no cal.',
      "Aquí hi caben els veïns, els qui treballen a la zona al migdia i qui busca un racó autèntic lluny del bullici de les Rambles."
    ],
    [
      'Casabella has been in the same spot on Carrer de Montserrat for more than thirty years, just steps from La Rambla. A neighborhood bar and restaurant where locals come for breakfast, the daily menu, afternoon tapas or a slow dinner.',
      "The cooking hasn't changed and it doesn't need to: classic tapas, made-to-order omelettes, homemade croquettes, rice dishes, stews and fresh fish of the day. Old-school recipes done properly.",
      "It's a place for regulars, for people who work in the area at midday, and for anyone looking for an authentic corner away from the noise of the Ramblas."
    ]
  ),

  // Grupos
  gruposEyebrow: i18nStr('Comidas de grupo', 'Àpats de grup', 'Group meals'),
  gruposTitulo: i18nStr(
    'Un espacio para celebraciones',
    'Un espai per a celebracions',
    'A space for gatherings'
  ),
  gruposCta: i18nStr(
    'Consultar disponibilidad',
    'Consultar disponibilitat',
    'Check availability'
  ),

  // Ventajas del servicio de grupos (grid con icono)
  gruposFeatures: [
    {
      _key: 'gf-aforo',
      _type: 'gruposFeature',
      icon: 'users',
      label: i18nStr('Aforo', 'Aforament', 'Capacity'),
      texto: i18nTxt(
        'Hasta 40 comensales en salón privado.',
        'Fins a 40 comensals en sala privada.',
        'Up to 40 guests in our private room.'
      )
    },
    {
      _key: 'gf-menu',
      _type: 'gruposFeature',
      icon: 'chef',
      label: i18nStr('Menú', 'Menú', 'Menu'),
      texto: i18nTxt(
        'Cartas cerradas o personalizadas para el evento.',
        "Cartes tancades o personalitzades per a l'esdeveniment.",
        'Fixed or bespoke menus for your event.'
      )
    },
    {
      _key: 'gf-bodega',
      _type: 'gruposFeature',
      icon: 'wine',
      label: i18nStr('Bodega', 'Celler', 'Cellar'),
      texto: i18nTxt(
        'Selección de vinos y maridajes a medida.',
        'Selecció de vins i maridatges a mida.',
        'Curated wine and pairing selections.'
      )
    },
    {
      _key: 'gf-horario',
      _type: 'gruposFeature',
      icon: 'clock',
      label: i18nStr('Horario', 'Horari', 'Time'),
      texto: i18nTxt(
        'Comidas, cenas y sobremesas sin prisa.',
        'Dinars, sopars i sobretaules sense pressa.',
        'Lunch, dinner and long, unhurried afternoons.'
      )
    }
  ],

  // Horarios
  horariosTitulo: i18nStr('Ven a conocernos', 'Vine a conèixer-nos', 'Come visit us'),
  horariosTexto: i18nTxt(
    'Abierto todos los días. De lunes a viernes desde las 07:00; sábados y domingos desde las 08:00. La cocina cierra a las 23:30.',
    'Obert cada dia. De dilluns a divendres des de les 07:00; dissabtes i diumenges des de les 08:00. La cuina tanca a les 23:30.',
    'Open every day. Monday to Friday from 07:00; weekends from 08:00. Kitchen closes at 23:30.'
  ),
  horariosAbierto: i18nStr(
    'Estamos abiertos hasta las {hora}.',
    'Estem oberts fins a les {hora}.',
    'Open now until {hora}.'
  ),
  horariosProximaApertura: i18nStr(
    'Hoy abrimos a las {hora}.',
    'Avui obrim a les {hora}.',
    'Opens today at {hora}.'
  ),
  horariosCerrado: i18nStr(
    'Hoy no abrimos. Nos vemos mañana.',
    'Avui no obrim. Ens veiem demà.',
    'Closed today. See you tomorrow.'
  ),
  horariosSemana: HORARIOS_SEMANA,

  // Textos NAV (labels de los links del menú)
  textosNav: {
    linkLocal: i18nStr('Historia', 'Història', 'Story'),
    linkCocina: i18nStr('Carta', 'Carta', 'Menu'),
    linkVinos: i18nStr('Vinos', 'Vins', 'Wine'),
    linkGaleria: i18nStr('Galería', 'Galeria', 'Gallery'),
    linkReservar: i18nStr('Llamar', "Truca'ns", 'Call')
  },

  // Textos SECCIONES
  textosSecciones: {
    platosEyebrow: i18nStr('La cocina', 'La cuina', 'The kitchen'),
    platosTitulo: i18nStr('Nuestra carta', 'La nostra carta', 'Our menu'),
    vinosEyebrow: i18nStr('Para beber', 'Per beure', 'To drink'),
    vinosTitulo: i18nStr('Vinos y cervezas', 'Vins i cerveses', 'Wines and beers'),
    vinosNotaFinal: i18nStr(
      'Selección corta para acompañar la comida. Vinos por copa y botella disponibles.',
      'Selecció curta per acompanyar el menjar. Vins per copa i ampolla disponibles.',
      'A short selection to go with the food. Wines by the glass and by the bottle.'
    ),
    galeriaEyebrow: i18nStr('El local', 'El local', 'The place'),
    galeriaTitulo: i18nStr(
      'Un rincón del Raval',
      'Un racó del Raval',
      'A corner of El Raval'
    )
  },

  // Textos FORMULARIO (aunque Booking oculto, schema exige rellenarlos)
  textosForm: {
    titulo: i18nStr('Reserva tu mesa', 'Reserva la teva taula', 'Book your table'),
    intro: i18nTxt(
      'Rellena el formulario y te confirmamos por email. Para grupos de más de 6 personas, llámanos al +34 933 18 24 59.',
      "Omple el formulari i et confirmem per email. Per a grups de més de 6 persones, truca'ns al +34 933 18 24 59.",
      "Fill out the form and we'll confirm by email. For groups over 6, please call us on +34 933 18 24 59."
    ),
    labelNombre: i18nStr('Nombre', 'Nom', 'Name'),
    labelTelefono: i18nStr('Teléfono', 'Telèfon', 'Phone'),
    labelEmail: i18nStr('Email', 'Correu', 'Email'),
    labelComensales: i18nStr('Comensales', 'Comensals', 'Guests'),
    labelFecha: i18nStr('Fecha', 'Data', 'Date'),
    labelHora: i18nStr('Hora', 'Hora', 'Time'),
    labelNotas: i18nStr(
      'Notas (alergias, celebración, etc.)',
      'Notes (al·lèrgies, celebració, etc.)',
      'Notes (allergies, celebration, etc.)'
    ),
    submit: i18nStr('Enviar solicitud', 'Enviar sol·licitud', 'Send request'),
    exito: i18nStr(
      'Abriendo tu cliente de correo para enviar la solicitud…',
      'Obrint el teu client de correu per enviar la sol·licitud…',
      'Opening your email client to send the request…'
    )
  },

  // Textos FOOTER
  textosFooter: {
    colContacto: i18nStr('Contacto', 'Contacte', 'Contact'),
    bylineIzq: i18nStr(
      'Cocina casera en El Raval, Barcelona',
      'Cuina casolana al Raval, Barcelona',
      'Home cooking in El Raval, Barcelona'
    )
  },

  // SEO — meta title / description
  seoTitulo: i18nStr(
    'Casabella — Bar y cocina catalana en El Raval, Barcelona',
    'Casabella — Bar i cuina catalana al Raval, Barcelona',
    'Casabella — Traditional Catalan bar & kitchen in El Raval, Barcelona'
  ),
  seoDescripcion: i18nTxt(
    'Bar-restaurante tradicional en El Raval desde hace más de 30 años. Menú del día 13–18€, tapas caseras y arroces. A un paso de La Rambla.',
    "Bar-restaurant tradicional al Raval des de fa més de 30 anys. Menú del dia 13–18€, tapes casolanes i arrossos. A un pas de La Rambla.",
    'Traditional bar and restaurant in El Raval, open for over 30 years. Daily menu €13–18, homemade tapas and rice dishes. A short walk from La Rambla.'
  ),

  // FAQ titulares (para el mock actual dice faqEyebrow, faqTitulo, faqTituloAcento)
  faqEyebrow: i18nStr('Preguntas frecuentes', 'Preguntes freqüents', 'Frequently asked'),
  faqTitulo: i18nStr('Todo lo que', 'Tot el que', 'Everything you'),
  faqTituloAcento: i18nStr('necesitas saber', 'has de saber', 'need to know'),

  // resumenIA (alimenta llms.txt y description del JSON-LD Restaurant)
  resumenIA: i18nTxt(
    'Casabella es un bar-restaurante tradicional en el corazón de El Raval, Barcelona, con más de tres décadas de historia. Situado en el Carrer de Montserrat, 15 (08001), a un paso de La Rambla y a cinco minutos andando del MACBA. Ofrece cocina catalana y española casera durante todo el día: desayunos, menú del día al mediodía (entre 13 y 18 euros, con entrante, principal, postre, pan y bebida), tapas por la tarde y cena continua hasta el cierre de cocina. La carta incluye tapas tradicionales como padrón, croquetas caseras, patatas bravas, ensaladilla rusa, esqueixada de bacalao, albóndigas y caracoles; bocadillos con tortilla de patatas, tortilla de calabacín o berenjena, pastrami y filete de ternera; principales como ternera con setas, pollo con patatas, merluza y arroces variados; y postres caseros como flan, pudín y bizcocho con nata. Abierto todos los días: lunes a viernes desde las 07:00, fines de semana desde las 08:00, con cocina hasta las 23:30. Dispone de pequeña terraza exterior, es accesible en silla de ruedas y sirve cerveza y vino. Ambiente tranquilo de barrio pese a la ubicación céntrica, con encanto de establecimiento de siempre. Formas de pago: efectivo, tarjeta de crédito y débito, contactless y Bizum. Teléfono: +34 933 18 24 59.',
    "Casabella és un bar-restaurant tradicional al cor del Raval, a Barcelona, amb més de tres dècades d'història. Situat al Carrer de Montserrat, 15 (08001), a un pas de La Rambla i a cinc minuts a peu del MACBA. Ofereix cuina catalana i espanyola casolana durant tot el dia: esmorzars, menú del dia al migdia (entre 13 i 18 euros, amb entrant, principal, postres, pa i beguda), tapes a la tarda i sopar continu fins al tancament de cuina. La carta inclou tapes tradicionals com pebrots del padró, croquetes casolanes, patates braves, amanida russa, esqueixada de bacallà, mandonguilles i cargols; entrepans amb truita de patates, truita de carbassó o d'albergínia, pastrami i filet de vedella; plats principals com vedella amb bolets, pollastre amb patates, lluç i arrossos variats; i postres casolanes com flam, púding i pa de pessic amb nata. Obert cada dia: de dilluns a divendres des de les 07:00, caps de setmana des de les 08:00, amb cuina fins a les 23:30. Disposa d'una petita terrassa exterior, és accessible amb cadira de rodes i serveix cervesa i vi. Formes de pagament: efectiu, targeta de crèdit i dèbit, contactless i Bizum. Telèfon: +34 933 18 24 59.",
    'Casabella is a traditional bar and restaurant in the heart of El Raval, Barcelona, with over three decades of history. Located at Carrer de Montserrat, 15 (08001), a short walk from La Rambla and five minutes from MACBA. It serves Catalan and Spanish home cooking all day: breakfast, midday menu of the day (between €13 and €18, with starter, main, dessert, bread and drink), afternoon tapas and evening service until the kitchen closes. The menu includes traditional tapas such as padrón peppers, homemade croquettes, patatas bravas, Russian salad, esqueixada (Catalan cod salad), meatballs and snails; sandwiches with potato omelette, courgette or aubergine omelette, pastrami and veal steak; main courses like veal with mushrooms, chicken with potatoes, hake and various rice dishes; and homemade desserts including flan, pudding and sponge cake with cream. Open every day: Monday to Friday from 07:00, weekends from 08:00, with kitchen open until 23:30. Small outdoor terrace, wheelchair accessible, beer and wine served. Payment methods accepted: cash, credit and debit card, contactless and Bizum. Phone: +34 933 18 24 59.'
  ),

  // FAQ — 8 preguntas
  faq: [
    {
      _key: 'faq1',
      _type: 'faqItem',
      pregunta: i18nStr(
        '¿Qué tipo de cocina hacéis?',
        'Quin tipus de cuina feu?',
        'What kind of food do you serve?'
      ),
      respuesta: i18nTxt(
        'Cocina catalana y española casera. Tapas, tortillas al momento, croquetas caseras, arroces, guisos y pescado del día. Todo elaborado en la casa.',
        'Cuina catalana i espanyola casolana. Tapes, truites fetes al moment, croquetes casolanes, arrossos, guisats i peix del dia. Tot elaborat a casa.',
        'Traditional Catalan and Spanish home cooking. Tapas, made-to-order omelettes, homemade croquettes, rice dishes, stews and fresh fish of the day. Everything cooked in-house.'
      )
    },
    {
      _key: 'faq2',
      _type: 'faqItem',
      pregunta: i18nStr(
        '¿Cuánto cuesta el menú del día?',
        'Quant costa el menú del dia?',
        'How much is the daily menu?'
      ),
      respuesta: i18nTxt(
        'Entre 13 y 18 euros según el día. Incluye entrante, principal, postre, pan y bebida.',
        'Entre 13 i 18 euros segons el dia. Inclou entrant, principal, postres, pa i beguda.',
        'Between €13 and €18 depending on the day. Includes a starter, main, dessert, bread and a drink.'
      )
    },
    {
      _key: 'faq3',
      _type: 'faqItem',
      pregunta: i18nStr('¿Dónde estáis?', 'On sou?', 'Where are you located?'),
      respuesta: i18nTxt(
        'Carrer de Montserrat, 15, en El Raval (08001 Barcelona). A menos de un minuto andando de La Rambla y a 5 minutos del MACBA.',
        "Carrer de Montserrat, 15, al Raval (08001 Barcelona). A menys d'un minut a peu de La Rambla i a 5 minuts del MACBA.",
        "Carrer de Montserrat, 15, in El Raval (08001 Barcelona). Less than a minute's walk from La Rambla and 5 minutes from MACBA."
      )
    },
    {
      _key: 'faq4',
      _type: 'faqItem',
      pregunta: i18nStr(
        '¿Qué horario tenéis?',
        'Quin horari teniu?',
        'What are your hours?'
      ),
      respuesta: i18nTxt(
        'Abrimos todos los días. De lunes a viernes desde las 07:00 y los fines de semana desde las 08:00. La cocina cierra a las 23:30.',
        'Obrim cada dia. De dilluns a divendres des de les 07:00 i els caps de setmana des de les 08:00. La cuina tanca a les 23:30.',
        'Open every day. Monday to Friday from 07:00, weekends from 08:00. Kitchen closes at 23:30.'
      )
    },
    {
      _key: 'faq5',
      _type: 'faqItem',
      pregunta: i18nStr(
        '¿Necesito reservar mesa?',
        'Cal reservar taula?',
        'Do I need to book?'
      ),
      respuesta: i18nTxt(
        'No aceptamos reservas online, pero podéis llamarnos al +34 933 18 24 59 y os apuntamos, sobre todo para el menú del día o si venís en grupo. Para tapa o copa por la tarde no hace falta.',
        "No acceptem reserves en línia, però podeu trucar-nos al +34 933 18 24 59 i us apuntem, sobretot per al menú del dia o si veniu en grup. Per a un tastet o una copa a la tarda no cal.",
        "We don't take online bookings, but you can call us on +34 933 18 24 59 and we'll note you down, especially for the daily menu or groups. For afternoon tapas or a drink, no booking needed."
      )
    },
    {
      _key: 'faq6',
      _type: 'faqItem',
      pregunta: i18nStr(
        '¿Tenéis opciones vegetarianas?',
        'Teniu opcions vegetarianes?',
        'Do you have vegetarian options?'
      ),
      respuesta: i18nTxt(
        'Sí. Tortillas de verdura (calabacín, berenjena, alcachofa según temporada), padrón, ensaladas y las verduras del día. Consultadnos por opciones sin gluten o alergias.',
        "Sí. Truites de verdura (carbassó, albergínia, carxofa segons temporada), pebrots del padró, amanides i les verdures del dia. Consulteu-nos per opcions sense gluten o al·lèrgies.",
        'Yes. Vegetable omelettes (courgette, aubergine, artichoke in season), padrón peppers, salads and vegetables of the day. Ask us about gluten-free options or allergies.'
      )
    },
    {
      _key: 'faq7',
      _type: 'faqItem',
      pregunta: i18nStr(
        '¿Podemos ir en grupo o hacer una celebración?',
        'Podem venir en grup o fer una celebració?',
        'Can we come as a group or hold a celebration?'
      ),
      respuesta: i18nTxt(
        'Sí. Tenemos espacio para grupos pequeños y podemos preparar menú cerrado. Llamadnos con antelación al +34 933 18 24 59.',
        "Sí. Tenim espai per a grups petits i podem preparar menú tancat. Truqueu-nos amb antelació al +34 933 18 24 59.",
        'Yes. We have space for small groups and can arrange a set menu. Call us in advance on +34 933 18 24 59.'
      )
    },
    {
      _key: 'faq8',
      _type: 'faqItem',
      pregunta: i18nStr(
        '¿Qué formas de pago aceptáis?',
        'Quines formes de pagament accepteu?',
        'What payment methods do you accept?'
      ),
      respuesta: i18nTxt(
        'Efectivo, tarjeta de crédito y débito, contactless y Bizum.',
        'Efectiu, targeta de crèdit i dèbit, contactless i Bizum.',
        'Cash, credit and debit cards, contactless and Bizum.'
      )
    }
  ]
};

// ─────────────────────────────────────────────────────────────────────────────
// Campos del ESPACIO (hero + manifiesto — se muestran en la home)
// ─────────────────────────────────────────────────────────────────────────────
const camposEspacio = {
  // Metadata mínimo del espacio (para el modelo single-espacio: 1 restaurante = 1 espacio)
  restaurante: ref(RESTAURANTE_ID),
  nombre: 'Restaurante',
  slug: { _type: 'slug', current: 'principal' },
  tipo: 'restaurant',
  orden: 10,

  heroTitulo: i18nStr(
    'Cocina casera de toda la vida',
    'Cuina casolana de tota la vida',
    "Home cooking the way it's always been"
  ),
  heroSubtitulo: i18nStr('en El Raval', 'al Raval', 'in El Raval'),
  heroMetaIzq: i18nStr(
    'Bar restaurante desde hace 30 años',
    'Bar restaurant des de fa 30 anys',
    'Neighborhood bar for over 30 years'
  ),
  heroMetaDer: i18nStr('El Raval · Barcelona', 'El Raval · Barcelona', 'El Raval · Barcelona'),
  heroNota: i18nTxt(
    'Bar tradicional a un paso de La Rambla. Tapas, arroces y menú del día abierto cada día del año.',
    "Bar tradicional a un pas de La Rambla. Tapes, arrossos i menú del dia obert cada dia de l'any.",
    "Traditional neighborhood bar a stone's throw from La Rambla. Tapas, rice dishes and daily menu, open every day of the year."
  ),
  heroCta: i18nStr(
    'Llamar para reservar',
    "Truca'ns per reservar",
    'Call to book'
  ),
  manifiestoEyebrow: i18nStr(
    'Tres décadas en el Raval',
    'Tres dècades al Raval',
    'Three decades in El Raval'
  ),
  manifiestoTexto: i18nTxt(
    'Cocinamos lo mismo que nos gustaría encontrarnos en un bar del barrio: sencillo, honesto, casero. Sin modas ni florituras. Producto, oficio y la barra abierta desde por la mañana.',
    'Cuinem el mateix que ens agradaria trobar en un bar del barri: senzill, honest, casolà. Sense modes ni floritures. Producte, ofici i la barra oberta des del matí.',
    "We cook the same food we'd want to find in our own neighborhood bar: simple, honest, homemade. No trends, no fuss. Good produce, craft, and the bar open from morning on."
  )
};

// ─────────────────────────────────────────────────────────────────────────────
// Ejecución
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const [restaurante, espacio] = await Promise.all([
    client.getDocument(RESTAURANTE_ID),
    client.getDocument(ESPACIO_ID)
  ]);

  console.log('🔎 Estado actual:');
  console.log(`   • ${RESTAURANTE_ID}: ${restaurante ? '✓ existe' : '✗ no existe'}`);
  console.log(`   • ${ESPACIO_ID}:      ${espacio ? '✓ existe' : '✗ no existe'}`);

  // Si el espacio no existe, lo creamos con lo mínimo. Luego el patch pone
  // todo el texto. Esto arregla el error "no tiene ningún espacio asociado".
  if (!espacio) {
    console.log('\n🏗  Creando doc espacio-casabella con esqueleto mínimo…');
    await client.createIfNotExists({
      _id: ESPACIO_ID,
      _type: 'espacio',
      restaurante: ref(RESTAURANTE_ID),
      nombre: 'Restaurante',
      slug: { _type: 'slug', current: 'principal' },
      tipo: 'restaurant',
      orden: 10
    } as never);
    console.log('   → creado');
  }

  // Idem para restaurante (raro que no exista, pero por seguridad).
  if (!restaurante) {
    console.log('\n🏗  Creando doc restaurante-casabella con esqueleto mínimo…');
    await client.createIfNotExists({
      _id: RESTAURANTE_ID,
      _type: 'restaurante',
      nombre: 'Casabella',
      slug: { _type: 'slug', current: 'casabella' },
      idiomaPorDefecto: ref(IDIOMA_ES)
    } as never);
    console.log('   → creado');
  }

  console.log('\n📄 Actualizando restaurante Casabella (texto, datos globales, ref espacios[])…');
  await client.patch(RESTAURANTE_ID).set(camposRestaurante).commit();
  console.log('   → OK');

  console.log('🏠 Actualizando espacio Casabella (hero, manifiesto, ref restaurante)…');
  await client.patch(ESPACIO_ID).set(camposEspacio).commit();
  console.log('   → OK');

  // Verificación final: la ref bidireccional debe existir.
  const check = await client.fetch<{
    espaciosLen: number;
    espacioRest: string | null;
  }>(
    `{
       "espaciosLen": count(*[_id == $rid][0].espacios[]),
       "espacioRest": *[_id == $eid][0].restaurante._ref
     }`,
    { rid: RESTAURANTE_ID, eid: ESPACIO_ID }
  );

  console.log('\n🔗 Verificación de relación bidireccional:');
  console.log(`   restaurante.espacios[] length = ${check.espaciosLen}`);
  console.log(`   espacio.restaurante._ref      = ${check.espacioRest}`);

  const ok = check.espaciosLen >= 1 && check.espacioRest === RESTAURANTE_ID;
  if (!ok) {
    console.error(
      '\n❌ La relación restaurante ↔ espacio NO quedó completa. Revisa el Studio a mano.'
    );
    process.exit(1);
  }

  console.log('\n✅ Seed Casabella completado.');
  console.log('   • Imágenes preservadas (heroImagen, sobreImagenes, galeria, logo…)');
  console.log('   • Cartas de platos y vinos intactas (edítalas en el Studio)');
  console.log('   • Otros restaurantes no tocados');
  console.log('\n   Pendiente que el cliente rellene desde el Studio:');
  console.log('   - contacto.email');
  console.log('   - mapaUrl (embed URL de Google Maps)');
  console.log('   - heroImagen, sobreImagenes (1-3), galeria, gruposImagen');
  console.log('   - logo, favicon, iconoApp, seoImagen');
}

main().catch((err) => {
  console.error('❌ Error en seed:', err);
  process.exit(1);
});
