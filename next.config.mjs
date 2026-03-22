/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/join',
        permanent: false,
      },
    ]
  },
}

export default nextConfig
