/** @type {import('next').NextConfig} */
console.log('🔍 NEXT_PUBLIC_WHATSAPP_API_URL:', process.env.NEXT_PUBLIC_WHATSAPP_API_URL);

const nextConfig = {
  experimental: {
    // Otimização de performance
    optimizePackageImports: ['lucide-react'],
    scrollRestoration: true
  },
  // Configuração de build otimizada
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  },
  // Configuração de chunks otimizada
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      }
    }
    config.externals.push('puppeteer')
    return config
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_WHATSAPP_API_URL: process.env.NEXT_PUBLIC_WHATSAPP_API_URL,
  },
  images: {
    unoptimized: true
  },
  async headers() {
    return [
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }
        ]
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
        ]
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https: wss: https://api.medicosderesultado.com.br https://udzmlnnztzzwrphhizol.supabase.co;"
          },
          { key: 'CF-RUM', value: 'off' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' }
        ]
      }
    ]
  },
  async redirects() {
    return [
      {
        source: '/cdn-cgi/rum',
        destination: '/',
        permanent: false
      },
      {
        source: '/cdn-cgi/:path*',
        destination: '/',
        permanent: false
      }
    ]
  }
}

module.exports = nextConfig