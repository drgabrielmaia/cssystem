/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true
  },
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },

  // SWC minifier (faster than Terser)
  swcMinify: true,

  // Otimizações de bundle
  experimental: {
    esmExternals: true,
    optimizePackageImports: ['lucide-react'],
  },

  // Tree shaking e otimizações webpack
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    return config;
  },

  // Compressão
  compress: true,

  // Powered by header off (minor perf)
  poweredByHeader: false,

  // Remover console.logs em produção
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
}

module.exports = nextConfig
