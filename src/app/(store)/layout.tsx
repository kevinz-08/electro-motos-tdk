import Link from 'next/link'
import Image from 'next/image'
import { Suspense } from 'react'
import { Navbar } from '@/components/nav/Navbar'
import { WhatsAppButton } from '@/components/ui/WhatsAppButton'

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Suspense requerido por useSearchParams() dentro de Navbar */}
      <Suspense fallback={<div className="h-16 bg-black border-b border-white/10" />}>
        <Navbar />
      </Suspense>

      <main className="flex-1">{children}</main>
      <WhatsAppButton />

      <footer className="bg-white text-gray-500 py-10 mt-16 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <Image src="/assets/LogoPage.png" alt="Electro Motos Tony" width={120} height={34} className="object-contain mb-3" style={{ height: 'auto' }} />
              <p className="text-sm">Taller especializado en repuestos y servicio técnico de motos en Colombia.</p>
            </div>
            <div>
              <h4 className="text-gray-900 font-semibold mb-3">Categorías</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/catalogo?category=frenos" className="hover:text-blue-600 transition-colors">Frenos</Link></li>
                <li><Link href="/catalogo?category=motores" className="hover:text-blue-600 transition-colors">Motores</Link></li>
                <li><Link href="/catalogo?category=llantas" className="hover:text-blue-600 transition-colors">Llantas</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-gray-900 font-semibold mb-3">Contacto</h4>
              <ul className="space-y-2 text-sm">
                <li>📍 Colombia</li>
                <li>📞 +57 300 000 0000</li>
                <li>✉️ soporte@electromotos-tony.co</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-100 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>© {new Date().getFullYear()} Electro Motos Tony. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </>
  )
}
