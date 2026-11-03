// Prisma CLI configuration (migrations, introspection).
// The CLI uses DIRECT_URL when it is set (a connection that bypasses any pooler),
// otherwise DATABASE_URL. With Cloud SQL there is no pooler: run the Cloud SQL
// Auth Proxy and point DATABASE_URL at it (see DEVELOPMENT.md).
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
