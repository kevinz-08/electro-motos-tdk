import type { ReactNode } from 'react'

interface CatalogHeroProps {
  children: ReactNode
}

export function CatalogHero({ children }: CatalogHeroProps) {
  return (
    <div className="relative h-screen overflow-hidden">

      {/* Video de fondo */}
      <video
        src="/assets/video-hero-catalog.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Capa oscura base */}
      <div aria-hidden className="absolute inset-0 bg-black/55" />

      {/* Gradiente adicional top/bottom para legibilidad del texto */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

      {/* Contenido */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4">
        {children}
      </div>

      {/* Indicador de scroll */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 animate-bounce">
        <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

    </div>
  )
}
