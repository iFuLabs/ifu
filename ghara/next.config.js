/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/:path*`,
      },
    ]
  },
  async redirects() {
    return [
      // Legacy Comply routes → Ghara equivalents
      { source: '/comply', destination: '/compliance', permanent: true },
      { source: '/comply/:path*', destination: '/compliance', permanent: true },
      // Legacy FinOps routes → Ghara equivalents
      { source: '/finops', destination: '/cost', permanent: true },
      { source: '/finops/:path*', destination: '/cost', permanent: true },
    ]
  },
}

module.exports = nextConfig
