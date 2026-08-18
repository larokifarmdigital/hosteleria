import type { StructureResolver } from 'sanity/structure';

/**
 * Estructura de navegación del Studio:
 *
 *   🌐 Idiomas
 *   ──────────
 *   Restaurantes                 ← lista de restaurantes
 *     └─ [click en uno]
 *         ├─ 📄 Ficha            ← el doc `restaurante` entero (con groups internos)
 *         ├─ 🍷 Vinos            ← categorías y vinos filtrados por restaurante
 *         │   ├─ Categorías
 *         │   └─ Todos los vinos
 *         ├─ 🍽 Platos
 *         │   ├─ Categorías
 *         │   └─ Todos los platos
 *         └─ ⭐ Reseñas
 */
export const structure: StructureResolver = (S) =>
  S.list()
    .title('CMS')
    .items([
      S.documentTypeListItem('idioma').title('🌐 Idiomas'),

      S.divider(),

      S.listItem()
        .id('restauranteYContenido')
        .title('Restaurantes')
        .schemaType('restaurante')
        .child(
          S.documentTypeList('restaurante')
            .title('Restaurantes')
            .child((restauranteId) =>
              S.list()
                .title('Restaurante')
                .items([
                  S.listItem()
                    .id('ficha')
                    .title('📄 Ficha')
                    .child(
                      S.document()
                        .documentId(restauranteId)
                        .schemaType('restaurante'),
                    ),

                  S.divider(),

                  S.listItem()
                    .id('vinos')
                    .title('🍷 Vinos')
                    .child(
                      S.list()
                        .title('Vinos')
                        .items([
                          S.listItem()
                            .id('categoriasVino')
                            .title('Categorías')
                            .child(
                              S.documentList()
                                .schemaType('categoriaVino')
                                .title('Categorías de vino')
                                .filter('_type == "categoriaVino" && restaurante._ref == $id')
                                .params({ id: restauranteId })
                                .defaultOrdering([{ field: 'orden', direction: 'asc' }]),
                            ),
                          S.listItem()
                            .id('todosVinos')
                            .title('Todos los vinos')
                            .child(
                              S.documentList()
                                .schemaType('vino')
                                .title('Vinos')
                                .filter('_type == "vino" && restaurante._ref == $id')
                                .params({ id: restauranteId })
                                .defaultOrdering([{ field: 'orden', direction: 'asc' }]),
                            ),
                        ]),
                    ),

                  S.listItem()
                    .id('platos')
                    .title('🍽 Platos')
                    .child(
                      S.list()
                        .title('Platos')
                        .items([
                          S.listItem()
                            .id('categoriasPlato')
                            .title('Categorías')
                            .child(
                              S.documentList()
                                .schemaType('categoriaPlato')
                                .title('Categorías de plato')
                                .filter('_type == "categoriaPlato" && restaurante._ref == $id')
                                .params({ id: restauranteId })
                                .defaultOrdering([{ field: 'orden', direction: 'asc' }]),
                            ),
                          S.listItem()
                            .id('todosPlatos')
                            .title('Todos los platos')
                            .child(
                              S.documentList()
                                .schemaType('plato')
                                .title('Platos')
                                .filter('_type == "plato" && restaurante._ref == $id')
                                .params({ id: restauranteId })
                                .defaultOrdering([{ field: 'orden', direction: 'asc' }]),
                            ),
                        ]),
                    ),

                  S.divider(),

                  S.listItem()
                    .id('resenas')
                    .title('⭐ Reseñas')
                    .child(
                      S.documentList()
                        .schemaType('resena')
                        .title('Reseñas')
                        .filter('_type == "resena" && restaurante._ref == $id')
                        .params({ id: restauranteId }),
                    ),

                  S.listItem()
                    .id('legal')
                    .title('⚖️ Legal')
                    .child(
                      S.documentList()
                        .schemaType('paginaLegal')
                        .title('Páginas legales')
                        .filter('_type == "paginaLegal" && restaurante._ref == $id')
                        .params({ id: restauranteId })
                        .defaultOrdering([{ field: 'orden', direction: 'asc' }]),
                    ),
                ]),
            ),
        ),
    ]);
