import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env', override: false });

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/infrastructure/persistence/drizzle/schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!
  },
  strict: true,
  verbose: true
});
