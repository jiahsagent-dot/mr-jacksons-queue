/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/join',
        permanent: false,
      },
      {
        source: '/staff',
        destination: '/staff/dashboard',
        permanent: false,
      },
      {
        source: '/owner',
        destination: '/owner/dashboard',
        permanent: false,
      },
    ]
  },
}

export default nextConfig
