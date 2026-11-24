// Adaptadores de core/shared: entorno, cliente de Drizzle y envío de correo.
//
// El schema de Drizzle no se reexporta aquí: sus nombres chocan con los del dominio
// (`I18nValue`, `i18nHasAny`) y drizzle-kit lo necesita como entrada propia. Se importa
// de '@/core/shared/infrastructure/drizzle/schema', la única ruta interna permitida
// desde otro dominio.
export * from './drizzle/client';
export * from './email/consoleEmailSender';
export * from './email/resendEmailSender';
export * from './env';
