/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Production optimizations
  poweredByHeader: false,
  generateEtags: false,
  compress: true,
}

export default nextConfig