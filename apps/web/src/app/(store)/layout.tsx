import { Suspense } from 'react'
import { Navbar } from '@/components/nav/Navbar'
import { WhatsAppButton } from '@/components/ui/WhatsAppButton'
import { Footer } from '@/components/store/Footer'

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Suspense requerido por useSearchParams() dentro de Navbar */}
      <Suspense fallback={<div className="h-16 bg-black border-b border-white/10" />}>
        <Navbar />
      </Suspense>

      <main className="flex-1">{children}</main>
      <WhatsAppButton />
      <Footer />
    </>
  )
}
