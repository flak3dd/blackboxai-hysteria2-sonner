/** @type {import('next').NextConfig} */
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');

const nextConfig = {
  outputFileTracingRoot: repoRoot,
  serverExternalPackages: ["ssh2", "bullmq", "ioredis"],
  allowedDevOrigins: ["panel.anzstaff-club.au"],
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  compress: true,
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,

  images: {
    domains: [],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
    ];
  },

  // Use webpack
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },

  webpack: (config) => {
    // Add fallbacks for node modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    // Directory-level aliases so deep imports (e.g. @c2panel/infrastructure/security/session) resolve
    config.resolve.alias = {
      ...config.resolve.alias,
      '@c2panel/grok': path.resolve(repoRoot, 'packages/ai/src/agents/grok'),
      '@c2panel/shared': path.resolve(repoRoot, 'packages/shared/src'),
      '@c2panel/infrastructure': path.resolve(repoRoot, 'packages/infrastructure/src'),
      '@c2panel/ai': path.resolve(repoRoot, 'packages/ai/src'),
      '@c2panel/c2': path.resolve(repoRoot, 'packages/c2/src'),
      '@c2panel/security': path.resolve(repoRoot, 'packages/security/src'),
      '@c2panel/osint': path.resolve(repoRoot, 'packages/osint/src'),
      '@c2panel/ui': path.resolve(repoRoot, 'packages/ui/src'),
      '@': path.resolve(__dirname, './app'),
    };

    return config;
  },
};

module.exports = nextConfig;
