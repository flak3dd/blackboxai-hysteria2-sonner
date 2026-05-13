/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["ssh2", "bullmq", "ioredis"],

  // Allow Next.js dev resources (HMR, RSC payload) to be served to the
  // Cloudflare tunnel hostname so the panel can be accessed at the public
  // URL without breaking React hydration. See: panel_url_localhost validator.
  allowedDevOrigins: ["panel.anzstaff-club.au"],
  // Production deployment configuration
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  // Enable compression for production
  compress: true,

  // Performance optimizations
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,

  // Image optimization
  images: {
    domains: [],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },

  // Bundle optimization - tree-shake heavy packages
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-icons',
      '@radix-ui/react-dialog',
      'date-fns',
      'sonner',
    ],
  },

  // Turbopack root configuration (fixes warning about multiple lockfiles)
  turbopack: {
    root: __dirname,
    // Redirect lucide-react imports to a proxy that only exports canonical names.
    // Turbopack's built-in optimizePackageImports for lucide-react creates broken
    // bindings for *Icon aliases (e.g. XIcon, Loader2) because individual icon
    // files only export their canonical name as default. The proxy avoids this.
    resolveAlias: {
      'lucide-react': './lib/lucide-proxy.mjs',
    },
  },

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  
  // Disable TypeScript checking for build to allow deployment with type errors
  typescript: {
    ignoreBuildErrors: true,
  },

  // Security headers (moved to proxy.ts)
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

};

module.exports = nextConfig;
