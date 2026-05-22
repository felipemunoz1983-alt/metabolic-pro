import type { NextConfig } from "next";

/**
 * Workaround Vercel build failure en Next.js 16.2.6 + Turbopack:
 *
 *   TypeError: The "path" argument must be of type string. Received undefined
 *       at ignore-listed frames { code: 'ERR_INVALID_ARG_TYPE' }
 *
 * El error ocurre durante la generación del sourcemap ignore-list (feature
 * nuevo de Next 16 que filtra frames de node_modules en los stack traces
 * del dev overlay y de los logs de producción).
 *
 * Localmente con NODE_ENV=production el build pasa; en Vercel falla
 * consistentemente desde el commit 48cf0ff. La causa raíz es un path
 * undefined en el array que Next.js manda a path.relative() al construir
 * la ignore-list.
 *
 * Fixes aplicados (en orden de impacto):
 *  productionBrowserSourceMaps: false  — explícitamente, evita el camino
 *  de código que dispara la ignore-list para el browser. ESLint config en
 *  next.config se removió en Next 16; el lint se mantiene via husky pre-commit.
 */
const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nutrevo.cl',
        pathname: '/wp-content/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
