/** @type {import('next').NextConfig} */
console.log('🔍 NEXT_PUBLIC_WHATSAPP_API_URL:', process.env.NEXT_PUBLIC_WHATSAPP_API_URL);

const nextConfig = {
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
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https: wss: https://api.medicosderesultado.com.br https://udzmlnnztzzwrphhizol.supabase.co;"
          },
          {
            key: 'CF-RUM',
            value: 'off'
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
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