'use client'

/**
 * Banner hero por categoría — aparece antes de los productos populares
 * de cada sección en el scroll vertical del catálogo.
 *
 * Efecto visual:
 *   - Parallax JS puro: translateY al 25% de la velocidad del scroll.
 *   - Funciona en todos los browsers (evita el bug de background-attachment:fixed
 *     con compositing layers en Chrome/webkit).
 *   - Gradiente de izquierda para que el texto sea legible.
 *
 * Las imágenes se ubican en public/assets/bannerByCategory/[slug].jpg.
 * Mientras no existan, se usa la imagen de ejemplo como fallback.
 */
import { useRef, useEffect } from 'react'
import Link from 'next/link'

interface Props {
  slug: string
  name: string
  description: string
  imageSrc: string
}

export function CategoryHeroBanner({ slug, name, description, imageSrc }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const bgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => {
      const wrapper = wrapperRef.current
      const bg = bgRef.current
      if (!wrapper || !bg) return
      const rect = wrapper.getBoundingClientRect()
      // Solo calcular mientras el banner es visible en el viewport
      if (rect.bottom < 0 || rect.top > window.innerHeight) return
      // Movimiento suave: la imagen se desplaza al 25% de la velocidad del scroll
      const offset = rect.top * 0.25
      bg.style.transform = `translateY(${offset}px)`
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div ref={wrapperRef} className="relative h-[55vh] min-h-[360px] overflow-hidden">
      {/* Fondo con parallax */}
      <div
        ref={bgRef}
        aria-hidden
        className="absolute inset-0 -top-[10%] h-[120%] bg-cover bg-center will-change-transform"
        style={{ backgroundImage: `url('${imageSrc}')` }}
      />

      {/* Overlay gradiente */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-transparent" />

      {/* Contenido */}
      <div className="relative z-10 h-full flex flex-col justify-end px-8 pb-12 md:px-16 md:pb-14">
        <span className="text-[10px] font-bold tracking-[0.3em] text-white/50 uppercase mb-2">
          Categoría
        </span>
        <h2 className="text-4xl md:text-5xl font-black text-white uppercase leading-none mb-3">
          {name}
        </h2>
        <p className="text-white/65 text-sm mb-7 max-w-md leading-relaxed">
          {description}
        </p>
        <Link
          href={`/catalogo?category=${slug}`}
          className="inline-flex items-center gap-2 bg-sky-400 text-black px-7 py-3 rounded-full font-bold text-sm hover:bg-sky-500 hover:text-white active:scale-95 transition-all w-fit"
        >
          Ver más
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  )
}
