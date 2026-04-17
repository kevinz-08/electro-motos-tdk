'use client'

/**
 * Hero principal del catálogo con video de fondo.
 *
 * El video se reproduce automáticamente, en loop, sin sonido y con
 * preload="auto" para que arranque lo antes posible. Se aplica un
 * efecto de parallax via JS (translateY al 25% del scroll) sobre el
 * elemento <video> — funciona en todos los browsers.
 *
 * Los children son server-rendered (composición pattern de App Router):
 * el Server Component pasa el contenido como JSX y este cliente solo
 * agrega el comportamiento de scroll.
 */
import { useEffect, useRef, type ReactNode } from 'react'

interface CatalogHeroProps {
  children: ReactNode
}

export function CatalogHero({ children }: CatalogHeroProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const onScroll = () => {
      const el = videoRef.current
      if (!el) return
      const hero = el.parentElement
      if (!hero) return
      const rect = hero.getBoundingClientRect()
      if (rect.bottom < 0) return
      el.style.transform = `translateY(${window.scrollY * 0.25}px)`
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="relative h-screen overflow-hidden">

      {/* Video de fondo con parallax */}
      <video
        ref={videoRef}
        src="/assets/video-hero-catalog.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden
        className="absolute inset-0 -top-[10%] h-[120%] w-full object-cover will-change-transform"
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
