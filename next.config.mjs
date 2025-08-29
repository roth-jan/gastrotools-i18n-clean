/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  images: {
    domains: ['localhost', 'gastrotools.de'],
    unoptimized: false,
  },
  // Production optimizations
  poweredByHeader: false,
  generateEtags: false,
  compress: true,
}

export default nextConfig