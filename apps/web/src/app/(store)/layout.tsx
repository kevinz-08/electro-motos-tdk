import { Suspense } from 'react'
import { Navbar } from '@/components/nav/Navbar'
import { MotorcycleSelectorBar } from '@/components/store/MotorcycleSelectorBar'
import { WhatsAppButton } from '@/components/ui/WhatsAppButton'
import { Footer } from '@/components/store/Footer'
import { GuestCartMerger } from '@/components/checkout/GuestCartMerger'

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Suspense requerido por useSearchParams() dentro de Navbar */}
      <Suspense fallback={<div className="h-16 bg-black border-b border-white/10" />}>
        <Navbar />
      </Suspense>

      {/* Selector "¿Qué moto tienes?" (docs/seo/, Fase 2). Solo se renderiza si
          hay catálogo de motos cargado. */}
      <MotorcycleSelectorBar />

      <GuestCartMerger />
      <main className="flex-1">{children}</main>
      <WhatsAppButton />
      <Footer />
    </>
  )
}
