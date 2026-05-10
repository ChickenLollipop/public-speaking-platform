/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'speaking-platform-videos.s3.amazonaws.com',
      },
    ],
  },
};

module.exports = nextConfig;
