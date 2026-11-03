import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // A self-contained server (`.next/standalone`), for the container that runs on Cloud Run.
  output: 'standalone',
  // The workspace root (builds run from apps/web), so the shared packages and their dependencies are traced into it.
  outputFileTracingRoot: path.resolve(process.cwd(), '../..'),
  // Shared packages ship TypeScript source.
  transpilePackages: ['@catalysis/api', '@catalysis/bible-nabre', '@catalysis/catechism', '@catalysis/lectionary', '@catalysis/db', '@catalysis/ui-tokens'],
  // The database driver runs in Node as it is, not bundled.
  serverExternalPackages: ['pg', '@prisma/adapter-pg'],
};

export default nextConfig;
