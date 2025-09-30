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
  }
}

module.exports = nextConfig