import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Shared packages ship TypeScript source.
  transpilePackages: ['@catalysis/api', '@catalysis/bible-nabre', '@catalysis/db', '@catalysis/ui-tokens'],
  // The database driver runs in Node as it is, not bundled.
  serverExternalPackages: ['pg', '@prisma/adapter-pg'],
};

export default nextConfig;
