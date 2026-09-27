// Prisma CLI configuration (migrations, introspection).
// Migrations need a session-mode connection, so the CLI uses DIRECT_URL; the
// app itself connects through the transaction-mode pooler in DATABASE_URL.
import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// The connection strings live with the web app, which is what talks to the database.
config({ path: '../../apps/web/.env', quiet: true });
config({ path: '../../apps/web/.env.local', override: true, quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '' },
});
