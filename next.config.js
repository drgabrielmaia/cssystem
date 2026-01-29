/** @type {import('next').NextConfig} */
// Force redeploy 2026-01-29 15:47 - Fixing 404 chunks
const nextConfig = {
  images: {
    unoptimized: true
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_WHATSAPP_API_URL: process.env.NEXT_PUBLIC_WHATSAPP_API_URL,
  },
  // Configuração mais simples para CSS
  experimental: {
    // Remover optimizeCss que está causando problemas
  },
  // Desabilitar preload automático de CSS
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Configurar webpack para otimizar CSS
  webpack: (config, { dev, isServer }) => {
    config.externals.push('puppeteer')

    // Otimizar CSS apenas em produção
    if (!dev && !isServer) {
      // Desabilitar preload automático de CSS não crítico
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          styles: {
            name: 'styles',
            type: 'css/mini-extract',
            chunks: 'all',
            enforce: true,
          },
        },
      }
    }

    return config
  },
  async headers() {
    return [
      {
        source: '/_next/static/css/(.*)',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/css'
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        source: '/_next/static/chunks/(.*)',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript'
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'CF-RUM', value: 'off' }
        ]
      }
    ]
  }
}

module.exports = nextConfig