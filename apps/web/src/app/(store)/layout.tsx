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

      <footer className="bg-black text-gray-300 py-10 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <Image src="/assets/logo.png" alt="H2R Online Store" width={120} height={34} className="object-contain mb-3" style={{ height: 'auto' }} />
              <p className="text-sm">Taller especializado en repuestos y servicio técnico de motos en Colombia.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Categorías</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/catalogo?category=sistema-electrico" className="hover:text-sky-400 transition-colors">Sistema Eléctrico</Link></li>
                <li><Link href="/catalogo?category=repuestos" className="hover:text-sky-400 transition-colors">Repuestos</Link></li>
                <li><Link href="/catalogo?category=aceites" className="hover:text-sky-400 transition-colors">Aceites</Link></li>
                <li><Link href="/catalogo?category=llantas" className="hover:text-sky-400 transition-colors">Llantas</Link></li>
                <li><Link href="/catalogo?category=accesorios" className="hover:text-sky-400 transition-colors">Accesorios</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Contacto</h4>
              <ul className="space-y-2 text-sm">
                <li>📍 Bucaramanga, Colombia</li>
                <li>📞 +57 315 292 6690</li>
                <li>✉️ h2ronlinestore@gmail.com</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-8 text-center text-sm text-gray-500">
            <p>© {new Date().getFullYear()} H2R Online Store. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </>
  )
}
