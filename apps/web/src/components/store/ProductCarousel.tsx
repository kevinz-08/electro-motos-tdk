'use client'

/**
 * Carrusel horizontal de productos para la sección "Productos Populares".
 *
 * Los botones prev/next se inicializan en `false` (no se renderizan en SSR)
 * y se activan DESPUÉS de hidratar vía useEffect, evitando el hydration
 * mismatch que causaría renderizar botones cuya visibilidad depende de
 * medidas del DOM (scrollWidth, clientWidth) solo disponibles en el cliente.
 */
import { useRef, useEffect, useState } from 'react'
import { ProductCard } from './ProductCard'
import type { Product } from '@h2r/domain'

interface Props {
  products: Product[]
}

// Clase única por botón — sin saltos de línea para evitar normalización de whitespace
const BTN_BASE = 'absolute top-1/2 -translate-y-[calc(50%+1rem)] z-10 w-10 h-10 rounded-full bg-[var(--c-surface)] border border-[var(--c-border)] shadow-xl flex items-center justify-center c-text-2 hover:c-text hover:border-blue-500 transition-all opacity-0 group-hover/carousel:opacity-100'

export function ProductCarousel({ products }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)

  // Ambos inician en false → sin botones en SSR, se activan tras hidratación
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  useEffect(() => {
    const el = trackRef.current
    if (!el) return

    const update = () => {
      setCanPrev(el.scrollLeft > 8)
      setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8)
    }

    update()
    el.addEventListener('scroll', update, { passive: true })
    return () => el.removeEventListener('scroll', update)
  }, [products])

  const scroll = (dir: 'prev' | 'next') => {
    if (!trackRef.current) return
    const amount = (240 + 16) * 2
    trackRef.current.scrollBy({ left: dir === 'prev' ? -amount : amount, behavior: 'smooth' })
  }

  if (products.length === 0) return null

  return (
    <div className="relative group/carousel">
      {/* Track */}
      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory pb-2"
      >
        {products.map((product) => (
          <div key={product.id} className="shrink-0 snap-start w-[240px]">
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      {/* Prev — solo aparece en cliente cuando hay contenido a la izquierda */}
      {canPrev && (
        <button
          onClick={() => scroll('prev')}
          aria-label="Productos anteriores"
          className={`${BTN_BASE} -left-5`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Next — solo aparece en cliente cuando hay más contenido a la derecha */}
      {canNext && (
        <button
          onClick={() => scroll('next')}
          aria-label="Más productos"
          className={`${BTN_BASE} -right-5`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  )
}
