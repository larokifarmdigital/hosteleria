// API pública de core/restaurants — SOLO SERVIDOR (arrastra Drizzle y los adaptadores).
// Ficha del restaurante: contenido, borrador y publicación.
// Desde un componente de cliente, importar de '@/core/restaurants/domain'.
//
// Dependencias entre dominios: core/shared, core/auth, core/languages.
export * from './domain';
export * from './application';
export * from './infrastructure';
