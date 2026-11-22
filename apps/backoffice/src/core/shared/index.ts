// API pública de core/shared — SOLO SERVIDOR (arrastra Drizzle y los adaptadores).
// Tipos y piezas transversales: errores, i18n, correo, entorno y cliente de Drizzle.
// Desde un componente de cliente, importar de '@/core/shared/domain'.
//
// Dependencias entre dominios: ninguna (raíz del grafo).
export * from './domain';
export * from './application';
export * from './infrastructure';
