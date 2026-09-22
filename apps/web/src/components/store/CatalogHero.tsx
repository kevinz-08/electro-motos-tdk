/**
 * Hero del catálogo — póster a pantalla completa con el vídeo de fondo diferido.
 *
 * El póster (`video-hero-catalog-poster.webp`, 12 KB) es la imagen LCP: se pinta
 * de inmediato con `priority`. El vídeo lo monta `CatalogHeroVideo` (client)
 * solo en escritorio, con conexión buena y cuando el hilo principal está libre
 * — ver ese archivo para el detalle y para el porqué.
 *
 * Server Component: solo el vídeo diferido necesita JavaScript.
 */
import Image from 'next/image'
import type { ReactNode } from 'react'
import { CatalogHeroVideo } from './CatalogHeroVideo'

const POSTER = '/assets/video-hero-catalog-poster.webp'
const VIDEO = '/assets/video-hero-catalog.mp4'

interface CatalogHeroProps {
  children: ReactNode
}

export function CatalogHero({ children }: CatalogHeroProps) {
  return (
    <div className="relative h-screen overflow-hidden">

      {/* Póster — elemento LCP de la página */}
      <Image
        src={POSTER}
        alt=""
        aria-hidden
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />

      {/* Vídeo de fondo — se monta después, y solo si el dispositivo lo justifica */}
      <CatalogHeroVideo src={VIDEO} />

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
