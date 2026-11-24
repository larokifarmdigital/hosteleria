// API pública de core/site — SOLO SERVIDOR (arrastra Drizzle y los adaptadores).
// Lo que ve la web: lectura pública, estado, regeneración y tareas pendientes.
// Desde un componente de cliente, importar de '@/core/site/domain'.
//
// Dependencias entre dominios: todos los demás dominios.
export * from './domain';
export * from './application';
export * from './infrastructure';
