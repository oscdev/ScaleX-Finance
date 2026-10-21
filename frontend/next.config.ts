import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

/** Root `.env` ADMIN_PATH, so the public site matches Strapi without a second copy. */
function adminPathFromEnv(): string {
  const direct = (process.env.ADMIN_PATH || "").trim();
  if (direct) return direct;
  try {
    const text = fs.readFileSync(path.resolve(__dirname, "../.env"), "utf8");
    const match = text.match(/^ADMIN_PATH=(.*)$/m);
    if (!match) return "/admin";
    return match[1].trim().replace(/^["']|["']$/g, "") || "/admin";
  } catch {
    return "/admin";
  }
}

/** Same origin Strapi binds for Automation-Testing /suite (default :4100). */
const suiteOrigin =
  process.env.SUITE_PROXY_ORIGIN ||
  `http://127.0.0.1:${process.env.SUITE_PORT || 4100}`;

const nextConfig: NextConfig = {
  reactStrictMode: false,
  env: {
    NEXT_PUBLIC_ADMIN_PATH: adminPathFromEnv(),
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['scalex.local', 'localhost:3000'],
    },
    // Live Run POST /suite/api/live-run is multipart (CSV + PDFs). Default 10mb
    // truncates the body and the suite proxy hangs → HTTP 500 for clients.
    proxyClientMaxBodySize: '100mb',
  },
  // We intentionally ignore allowedDevOrigins lint as it is used by the Next.js runtime warning
  // @ts-ignore
  allowedDevOrigins: ['scalex.local', 'localhost:3000'],
  async rewrites() {
    const panelPath = adminPathFromEnv().replace(/\/$/, "") || "/admin";
    // Apache on this host sends unknown paths to Next. When the panel is not
    // /admin, forward that prefix to Strapi until the vhost proxies it directly.
    const adminProxy =
      panelPath === "/admin"
        ? []
        : [
            {
              source: panelPath,
              destination: `http://127.0.0.1:1337${panelPath}`,
            },
            {
              // (.*) keeps file names that contain dots, which Vite needs.
              source: `${panelPath}/:path(.*)`,
              destination: `http://127.0.0.1:1337${panelPath}/:path`,
            },
          ];
    return [
      ...adminProxy,
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
      {
        source: '/suite',
        destination: `${suiteOrigin}/suite`,
      },
      {
        source: '/suite/:path*',
        destination: `${suiteOrigin}/suite/:path*`,
      },
      {
        source: '/lender-pincode-tester',
        destination: `${suiteOrigin}/lender-pincode-tester`,
      },
      {
        source: '/lender-pincode-tester/:path*',
        destination: `${suiteOrigin}/lender-pincode-tester/:path*`,
      },
    ];
  },
};

export default nextConfig;
