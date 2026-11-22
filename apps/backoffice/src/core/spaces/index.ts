// API pública de core/spaces — SOLO SERVIDOR (arrastra Drizzle y los adaptadores).
// Espacios del restaurante y sus horarios.
// Desde un componente de cliente, importar de '@/core/spaces/domain'.
//
// Dependencias entre dominios: core/shared, core/restaurants.
export * from './domain';
export * from './application';
export * from './infrastructure';
