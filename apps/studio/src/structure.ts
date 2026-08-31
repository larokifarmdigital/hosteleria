import type { StructureResolver } from 'sanity/structure';

/**
 * Estructura de navegación del Studio con el modelo multi-espacio:
 *
 *   🌐 Idiomas
 *   ──────────
 *   Restaurantes                    ← lista de restaurantes/grupos
 *     └─ [click en uno]
 *         ├─ 📄 Ficha (globales)     ← contacto, redes, textos UI, SEO, IA
 *         ├─ ⚖️ Legal
 *         ├─ ⭐ Reseñas
 *         └─ 🏛 Espacios              ← lista de espacios de este restaurante
 *             └─ [click en un espacio]
 *                 ├─ 📄 Ficha del espacio ← hero, manifiesto, sobre, galería, grupos, horarios
 *                 ├─ 🍷 Vinos
 *                 │   ├─ Categorías
 *                 │   └─ Todos los vinos
 *                 ├─ 🍽 Platos
 *                 │   ├─ Categorías
 *                 │   └─ Todos los platos
 *                 └─ 🥂 Bebidas
 *                     ├─ Categorías
 *                     └─ Todas las bebidas
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
                    .title('📄 Ficha (globales)')
                    .child(
                      S.document()
                        .documentId(restauranteId)
                        .schemaType('restaurante'),
                    ),

                  S.divider(),

                  S.listItem()
                    .id('espacios')
                    .title('🏛 Espacios')
                    .child(
                      S.documentList()
                        .schemaType('espacio')
                        .title('Espacios de este restaurante')
                        .filter('_type == "espacio" && restaurante._ref == $id')
                        .params({ id: restauranteId })
                        .defaultOrdering([{ field: 'orden', direction: 'asc' }])
                        .child((espacioId) =>
                          S.list()
                            .title('Espacio')
                            .items([
                              S.listItem()
                                .id('fichaEspacio')
                                .title('📄 Ficha del espacio')
                                .child(
                                  S.document()
                                    .documentId(espacioId)
                                    .schemaType('espacio'),
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
                                            .filter(
                                              '_type == "categoriaVino" && espacio._ref == $id'
                                            )
                                            .params({ id: espacioId })
                                            .defaultOrdering([
                                              { field: 'orden', direction: 'asc' }
                                            ])
                                            .initialValueTemplates([
                                              S.initialValueTemplateItem(
                                                'categoriaVinoEnEspacio',
                                                { espacioId }
                                              )
                                            ]),
                                        ),
                                      S.listItem()
                                        .id('todosVinos')
                                        .title('Todos los vinos')
                                        .child(
                                          S.documentList()
                                            .schemaType('vino')
                                            .title('Vinos')
                                            .filter('_type == "vino" && espacio._ref == $id')
                                            .params({ id: espacioId })
                                            .defaultOrdering([
                                              { field: 'orden', direction: 'asc' }
                                            ])
                                            .initialValueTemplates([
                                              S.initialValueTemplateItem(
                                                'vinoEnEspacio',
                                                { espacioId }
                                              )
                                            ]),
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
                                            .filter(
                                              '_type == "categoriaPlato" && espacio._ref == $id'
                                            )
                                            .params({ id: espacioId })
                                            .defaultOrdering([
                                              { field: 'orden', direction: 'asc' }
                                            ])
                                            .initialValueTemplates([
                                              S.initialValueTemplateItem(
                                                'categoriaPlatoEnEspacio',
                                                { espacioId }
                                              )
                                            ]),
                                        ),
                                      S.listItem()
                                        .id('todosPlatos')
                                        .title('Todos los platos')
                                        .child(
                                          S.documentList()
                                            .schemaType('plato')
                                            .title('Platos')
                                            .filter('_type == "plato" && espacio._ref == $id')
                                            .params({ id: espacioId })
                                            .defaultOrdering([
                                              { field: 'orden', direction: 'asc' }
                                            ])
                                            .initialValueTemplates([
                                              S.initialValueTemplateItem(
                                                'platoEnEspacio',
                                                { espacioId }
                                              )
                                            ]),
                                        ),
                                    ]),
                                ),

                              S.listItem()
                                .id('bebidas')
                                .title('🥂 Bebidas')
                                .child(
                                  S.list()
                                    .title('Bebidas')
                                    .items([
                                      S.listItem()
                                        .id('categoriasBebida')
                                        .title('Categorías')
                                        .child(
                                          S.documentList()
                                            .schemaType('categoriaBebida')
                                            .title('Categorías de bebida')
                                            .filter(
                                              '_type == "categoriaBebida" && espacio._ref == $id'
                                            )
                                            .params({ id: espacioId })
                                            .defaultOrdering([
                                              { field: 'orden', direction: 'asc' }
                                            ])
                                            .initialValueTemplates([
                                              S.initialValueTemplateItem(
                                                'categoriaBebidaEnEspacio',
                                                { espacioId }
                                              )
                                            ]),
                                        ),
                                      S.listItem()
                                        .id('todasBebidas')
                                        .title('Todas las bebidas')
                                        .child(
                                          S.documentList()
                                            .schemaType('bebida')
                                            .title('Bebidas')
                                            .filter('_type == "bebida" && espacio._ref == $id')
                                            .params({ id: espacioId })
                                            .defaultOrdering([
                                              { field: 'orden', direction: 'asc' }
                                            ])
                                            .initialValueTemplates([
                                              S.initialValueTemplateItem(
                                                'bebidaEnEspacio',
                                                { espacioId }
                                              )
                                            ]),
                                        ),
                                    ]),
                                ),
                            ]),
                        ),
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
