// API pública de core/auth — SOLO SERVIDOR (arrastra Drizzle y los adaptadores).
// Cuentas, sesiones (Lucia), contraseñas y tokens de un solo uso.
// Desde un componente de cliente, importar de '@/core/auth/domain'.
//
// Dependencias entre dominios: core/shared.
export * from './domain';
export * from './application';
export * from './infrastructure';
