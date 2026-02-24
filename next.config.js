/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true
  },
  typescript: {
    ignoreBuildErrors: true
  },
  
  // Otimizações de bundle
  experimental: {
    esmExternals: true,
  },
  
  // Tree shaking e otimizações webpack
  webpack: (config, { isServer }) => {
    // Otimizações para client-side
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
  
  // Remover console.logs em produção
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
}

module.exports = nextConfig