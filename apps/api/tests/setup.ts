/**
 * Setup para vitest — carga .env.local antes de los tests para que las
 * variables como DATABASE_URL estén disponibles en los tests de integración.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env', override: false });
