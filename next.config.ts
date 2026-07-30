import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Larger body for image uploads on /api/chat
    serverActions: { bodySizeLimit: '10mb' },
  },
};

export default nextConfig;
