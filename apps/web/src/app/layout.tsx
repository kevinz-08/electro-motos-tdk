/**
 * Layout raíz de la aplicación — envuelve TODAS las páginas.
 *
 * Responsabilidades:
 *   1. Carga la fuente Geist de Google Fonts (variable CSS --font-geist)
 *   2. Define la metadata global (título base, descripción, Open Graph)
 *   3. Establece el idioma del documento (lang="es")
 *   4. Aplica clases globales: antialiased, h-full, fuente Geist
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
 *     "Pastillas de freno Brembo | Electro Motos Tony"
 *   Si no definen title, se usa el default:
 *     "Electro Motos Tony — Repuestos y Servicios"
 */
import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { Toaster } from 'sonner'
import { Analytics } from '@vercel/analytics/next'
import { AuthSessionProvider } from '@/components/providers/SessionProvider'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://h2r-store.vercel.app'),
  title: {
    default: 'H2R Online Store — Repuestos y Servicios',
    template: '%s | H2R Online Store',
  },
  description:
    'Taller especializado en motos eléctricas y a gasolina. Repuestos originales y servicio técnico en Colombia.',
  keywords: ['repuestos motos', 'taller motos', 'motos Colombia', 'repuestos motos Colombia'],
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    siteName: 'H2R Online Store',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-white text-gray-900" suppressHydrationWarning>
        <AuthSessionProvider>{children}</AuthSessionProvider>
        <Toaster theme="dark" position="bottom-right" richColors closeButton />
        <Analytics />
      </body>
    </html>
  )
}
