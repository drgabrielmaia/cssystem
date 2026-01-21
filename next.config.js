/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuração mínima para produção
  images: {
    unoptimized: true
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_WHATSAPP_API_URL: process.env.NEXT_PUBLIC_WHATSAPP_API_URL,
  },
  webpack: (config) => {
    config.externals.push('puppeteer')
    return config
  },
  async headers() {
    return [
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