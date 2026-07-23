import path from 'path'
import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
]

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    // En monorepo, apuntamos a la raíz del workspace para que Turbopack
    // pueda compilar archivos en packages/* que están fuera de apps/web.
    root: path.resolve(__dirname, '../..'),
  },
  images: {
    // Cloudinary ya entrega las imágenes de producto optimizadas
    // (f_auto,q_auto,w_N,c_limit vía cloudinaryUrl()). Este loader evita que
    // Vercel Image Optimization las vuelva a transformar y consuma cuota
    // de "Image Optimization - Transformations" de forma redundante.
    loader: 'custom',
    loaderFile: './src/lib/cloudinary-loader.ts',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}

export default withSentryConfig(nextConfig, {
  // Suppress Sentry CLI output outside of CI
  silent: !process.env['CI'],
  // Source map upload requires SENTRY_AUTH_TOKEN + SENTRY_ORG + SENTRY_PROJECT.
  // Without them this is a no-op — add them in Vercel env vars when ready.
  sourcemaps: { disable: true },
  disableLogger: true,
  widenClientFileUpload: true,
})
