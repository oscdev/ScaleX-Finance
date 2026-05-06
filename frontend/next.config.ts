import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  turbopack: {
    root: path.resolve(__dirname),
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['scalex.local', 'localhost:3000'],
    },
  },
  // We intentionally ignore allowedDevOrigins lint as it is used by the Next.js runtime warning
  // @ts-ignore
  allowedDevOrigins: ['scalex.local', 'localhost:3000'],
  async rewrites() {
    return [
      {
        source: '/strapi-api/upload',
        destination: 'http://127.0.0.1:1337/api/upload',
      },
      {
        source: '/strapi-api/:path*',
        destination: 'http://127.0.0.1:1337/api/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://127.0.0.1:1337/uploads/:path*',
      },
    ];
  },
};

export default nextConfig;
