/**
 * Layout raíz de la aplicación — envuelve TODAS las páginas.
 *
 * Responsabilidades:
 *   1. Carga la fuente Geist de Google Fonts (variable CSS --font-geist)
 *   2. Define la metadata global (título base, descripción, Open Graph, canonical)
 *   3. Establece el idioma del documento (lang="es-CO")
 *   4. Aplica clases globales: antialiased, h-full, fuente Geist
 *
 * lang="es-CO" (no "es"): el sitio vende solo en Colombia, con precios en COP y
 * términos locales. El `hreflang` correspondiente lo emite `canonical()` de
 * lib/seo.ts en cada plantilla.
 *
 * El canonical de este layout ("/") es solo el valor por defecto: cada plantilla
 * indexable define el suyo con `alternates: canonical(<ruta>)`.
 *
 * suppressHydrationWarning en <body>:
 *   Algunas extensiones del navegador (gestores de contraseñas, traductores,
 *   extensiones de accesibilidad) inyectan atributos en el <body> DESPUÉS de
 *   que el servidor renderiza el HTML pero ANTES de que React hidrata el DOM.
 *   Esto genera un warning de hidratación:
 *     "Prop `bis_register` did not match. Server: '' Client: 'W3siQ...'"
 *   El prop suppressHydrationWarning silencia este warning SOLO para el elemento
 *   <body> (no se propaga a sus hijos).
 *
 * metadata.title.template:
 *   Las páginas que definen su propio title usarán el template:
 *     "Pastillas de freno Brembo | H2R Online Store"
 *   Si no definen title, se usa el default:
 *     "H2R Online Store — Repuestos para moto con envío a toda Colombia"
 */
import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { Toaster } from 'sonner'
import { Analytics } from '@vercel/analytics/next'
import { GoogleAnalyticsLoader } from '@/components/analytics/GoogleAnalyticsLoader'
import { CookieConsentBanner } from '@/components/analytics/CookieConsentBanner'
import { AuthSessionProvider } from '@/components/providers/SessionProvider'
import { DEFAULT_OG_IMAGE } from '@/lib/opengraph'
import { SITE_URL, canonical } from '@/lib/seo'
import { JsonLd } from '@/components/seo/JsonLd'
import { organizationJsonLd, webSiteJsonLd } from '@/lib/structured-data'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  // SITE_URL es el host canónico (con www, sin barra final) — ver lib/seo.ts.
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'H2R Online Store — Repuestos para moto con envío a toda Colombia',
    template: '%s | H2R Online Store',
  },
  description:
    'Repuestos, aceites, llantas y accesorios para moto con envío a toda Colombia. Pago seguro con Wompi (PSE, Nequi y tarjetas) y contra entrega.',
  // Canonical por defecto (la home). Cada plantilla lo sobrescribe con el suyo.
  alternates: canonical('/'),
  // Imagen global de OpenGraph. No usar app/opengraph-image.png: la metadata por archivo
  // tiene prioridad y taparía las imágenes por categoría del catálogo (README §23).
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    siteName: 'H2R Online Store',
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    images: [DEFAULT_OG_IMAGE.url],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO" className={`${geist.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-white text-gray-900" suppressHydrationWarning>
        {/*
          Identidad del negocio para buscadores y motores generativos: quién es
          H2R, su NIT, su dirección y sus perfiles oficiales, más la acción de
          búsqueda del sitio. Va en el layout raíz para que esté en todas las
          páginas (docs/seo/ Fase 3).
        */}
        <JsonLd data={[organizationJsonLd(), webSiteJsonLd()]} />
        <AuthSessionProvider>{children}</AuthSessionProvider>
        <Toaster theme="dark" position="bottom-right" richColors closeButton />
        <Analytics />
        {/* GA4 (Fase 4, H-11): solo se carga con NEXT_PUBLIC_GA_ID y consentimiento */}
        <GoogleAnalyticsLoader />
        <CookieConsentBanner />
      </body>
    </html>
  )
}
