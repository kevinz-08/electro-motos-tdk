'use client'

/**
 * Carrusel horizontal de categorías con auto-scroll.
 *
 * Comportamiento:
 *   - Auto-scroll cada 3 s hacia la derecha, de forma infinita (loop).
 *   - Al llegar al final vuelve suavemente al inicio.
 *   - El usuario puede pausar el auto-scroll hovering el carrusel o
 *     usando los botones ← →. Se reanuda 4 s después de soltar.
 *   - Botones prev/next siguen funcionando manualmente.
 *   - Imágenes más grandes: 280 px de ancho (antes 220 px).
 *
 * Las imágenes son assets estáticos en public/assets/exploreByCategory/[slug].jpg.
 * Next.js <Image> las optimiza automáticamente (WebP/AVIF, redimensionado) sin
 * necesidad de Cloudinary, que está reservado para assets de producto subidos por el admin.
 */
import Image from 'next/image'
import Link from 'next/link'
import { useRef, useEffect, useCallback } from 'react'

interface Category {
  id: string
  name: string
  slug: string
  productCount: number
}

interface Props {
  categories: Category[]
}

// ── Rutas de imágenes (categorías padre) ─────────────────────────────────────
const EXPLORE_IMAGE: Record<string, string> = {
  'sistema-electrico': '/assets/exploreByCategory/sistema-electrico.webp',
  'repuestos':         '/assets/exploreByCategory/repuestos.webp',
  'aceites':           '/assets/exploreByCategory/aceites.webp',
  'llantas':           '/assets/exploreByCategory/llantas.webp',
  'accesorios':        '/assets/exploreByCategory/accesorios.webp',
}

const FALLBACK = '/assets/exploreByCategory/explore-category-example.jpg'
const getImage = (slug: string) => EXPLORE_IMAGE[slug] ?? FALLBACK

// Intervalo entre avances automáticos (ms)
const AUTO_INTERVAL = 3000
// Tiempo de pausa tras interacción manual (ms)
const RESUME_DELAY = 4000
// Ancho de item + gap para avanzar de a 1 tarjeta
const ITEM_WIDTH = 280 + 16

export function CategoryExploreCarousel({ categories }: Props) {
  const trackRef   = useRef<HTMLDivElement>(null)
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const resumeRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pausedRef  = useRef(false)

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  const advance = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8
    if (atEnd) {
      // Volver al inicio suavemente
      el.scrollTo({ left: 0, behavior: 'smooth' })
    } else {
      el.scrollBy({ left: ITEM_WIDTH, behavior: 'smooth' })
    }
  }, [])

  const startAuto = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      if (!pausedRef.current) advance()
    }, AUTO_INTERVAL)
  }, [advance])

  const pauseAuto = useCallback((resumeAfter = RESUME_DELAY) => {
    pausedRef.current = true
    if (resumeRef.current) clearTimeout(resumeRef.current)
    resumeRef.current = setTimeout(() => {
      pausedRef.current = false
    }, resumeAfter)
  }, [])

  useEffect(() => {
    startAuto()
    return () => {
      if (timerRef.current)  clearInterval(timerRef.current)
      if (resumeRef.current) clearTimeout(resumeRef.current)
    }
  }, [startAuto])

  // ── Scroll manual ──────────────────────────────────────────────────────────
  const scroll = (dir: 'prev' | 'next') => {
    if (!trackRef.current) return
    pauseAuto()
    trackRef.current.scrollBy({
      left: dir === 'prev' ? -ITEM_WIDTH : ITEM_WIDTH,
      behavior: 'smooth',
    })
  }

  return (
    <div>
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black c-text">Repuestos</h2>
          <p className="text-sm c-text-3 mt-0.5">Explora por categoría</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll('prev')}
            aria-label="Anterior"
            className="w-9 h-9 rounded-full c-surface border c-border flex items-center justify-center c-text-2 hover:c-text hover:c-border-hover transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => scroll('next')}
            aria-label="Siguiente"
            className="w-9 h-9 rounded-full c-surface border c-border flex items-center justify-center c-text-2 hover:c-text hover:c-border-hover transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Track scrolleable */}
      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory pb-2"
        onMouseEnter={() => pauseAuto(999999)}
        onMouseLeave={() => { pausedRef.current = false }}
        onTouchStart={() => pauseAuto()}
      >
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/catalogo?category=${cat.slug}`}
            className="group shrink-0 snap-start w-[260px] sm:w-[280px]"
          >
            {/* Imagen retrato — más grande */}
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden c-surface-2 border c-border">
              <Image
                src={getImage(cat.slug)}
                alt={cat.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="280px"
                loading="lazy"
              />
              {/* Overlay hover */}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              {/* Badge count */}
              <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full">
                {cat.productCount} productos
              </div>
            </div>

            {/* Nombre */}
            <p className="mt-3 text-sm font-semibold c-text text-center group-hover:text-sky-500 transition-colors">
              {cat.name}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
