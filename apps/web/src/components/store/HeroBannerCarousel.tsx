'use client'

/**
 * Carrusel Hero de la home — puramente visual (README §22.2).
 *
 * - Sin texto superpuesto: cualquier mensaje viene diseñado dentro de la imagen.
 * - Art direction con <picture> + getImageProps(): imagen vertical (4:5) en < 768px
 *   e imagen horizontal (21:9) en ≥ 768px, cada una con su propio srcSet.
 * - Único elemento interactivo por slide: el botón CTA. Toda la imagen también
 *   enlaza al mismo destino (enlace oculto a lectores de pantalla para no duplicar foco).
 * - La primera slide carga eager con fetchPriority high (LCP); las demás lazy.
 * - Swipe táctil en móvil (README §25.2): arrastre horizontal > 50 px cambia de slide; los
 *   gestos verticales se ignoran para no bloquear el scroll de la página.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { getImageProps } from 'next/image'
import { cloudinaryUrl } from '@/lib/cloudinary'

type BannerItem = {
  id: string
  desktopSrc: string
  mobileSrc: string
  alt: string
  cta: { label: string; href: string }
}

interface HeroBannerCarouselProps {
  banners: BannerItem[]
}

const MOBILE_BREAKPOINT = '(min-width: 768px)'
/** Desplazamiento horizontal mínimo para que un gesto cuente como swipe. */
const SWIPE_THRESHOLD_PX = 50

function BannerPicture({ banner, eager }: { banner: BannerItem; eager: boolean }) {
  const common = {
    alt: banner.alt,
    sizes: '100vw',
    loading: eager ? ('eager' as const) : ('lazy' as const),
    fetchPriority: eager ? ('high' as const) : ('auto' as const),
  }
  const { props: { srcSet: desktopSrcSet } } = getImageProps({
    ...common,
    src: cloudinaryUrl(banner.desktopSrc, 'hero'),
    width: 1920,
    height: 823,
  })
  const { props: { srcSet: mobileSrcSet, ...imgProps } } = getImageProps({
    ...common,
    src: cloudinaryUrl(banner.mobileSrc, 'heroMobile'),
    width: 1080,
    height: 1350,
  })

  return (
    <picture>
      <source media={MOBILE_BREAKPOINT} srcSet={desktopSrcSet} />
      {/* eslint-disable-next-line jsx-a11y/alt-text -- alt viene en imgProps */}
      <img {...imgProps} srcSet={mobileSrcSet} className="absolute inset-0 w-full h-full object-cover" />
    </picture>
  )
}

export function HeroBannerCarousel({ banners }: HeroBannerCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const total = banners.length

  useEffect(() => {
    if (total <= 1 || isPaused) return
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % total)
    }, 5000)
    return () => clearInterval(timer)
  }, [total, isPaused])

  const goTo = useCallback((index: number) => {
    setActiveIndex(index)
  }, [])

  const goPrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + total) % total)
  }, [total])

  const goNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % total)
  }, [total])

  // ── Swipe táctil (móvil) ───────────────────────────────────────────────────
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0]
    if (!t) return
    touchStart.current = { x: t.clientX, y: t.clientY }
    setIsPaused(true)
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const start = touchStart.current
    touchStart.current = null
    setIsPaused(false)
    const t = e.changedTouches[0]
    if (!start || !t) return
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    // Solo cuenta si el gesto es claramente horizontal: evita robar el scroll vertical.
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) <= Math.abs(dy)) return
    if (dx < 0) goNext()
    else goPrev()
  }, [goNext, goPrev])

  if (total === 0) return null

  const active = banners[activeIndex]!

  return (
    <section
      aria-roledescription="carrusel"
      aria-label="Promociones destacadas"
      className="relative w-full aspect-[4/5] md:aspect-[21/9] md:max-h-[820px] overflow-hidden bg-gray-100"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={() => { touchStart.current = null; setIsPaused(false) }}
    >
      {banners.map((banner, index) => (
        <div
          key={banner.id}
          className="absolute inset-0"
          style={{
            opacity: index === activeIndex ? 1 : 0,
            transform: `scale(${index === activeIndex ? 1 : 1.03})`,
            transition: 'opacity 0.7s ease-out, transform 7s ease-out',
            pointerEvents: index === activeIndex ? 'auto' : 'none',
          }}
          aria-hidden={index !== activeIndex}
        >
          <BannerPicture banner={banner} eager={index === 0} />
          {/* Toda la imagen es clicable — enlace redundante con el CTA, oculto al teclado/lectores. */}
          <Link
            href={banner.cta.href}
            tabIndex={-1}
            aria-hidden="true"
            className="absolute inset-0"
          />
        </div>
      ))}

      {/* Degradado inferior sutil — solo para asegurar contraste del botón y los controles */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" />

      {/* CTA — centrado en mobile, alineado a la izquierda en desktop */}
      <div className="absolute z-10 inset-x-0 bottom-16 md:bottom-24 flex justify-center md:justify-start px-6 md:px-20 lg:px-24">
        <Link
          href={active.cta.href}
          className="inline-flex items-center gap-2 bg-sky-400 text-black font-bold px-8 py-4 rounded-xl text-base md:text-lg hover:bg-sky-300 hover:scale-[1.03] active:scale-95 transition-all duration-200 shadow-lg shadow-black/30"
        >
          {active.cta.label}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {total > 1 && (
        <>
          <div className="absolute bottom-5 md:bottom-8 left-6 md:left-20 z-20 hidden md:flex items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Banner anterior"
              className="w-10 h-10 rounded-full border border-white/30 bg-black/30 text-white/80 hover:bg-sky-500 hover:border-sky-500 hover:text-white transition-all duration-200 flex items-center justify-center backdrop-blur-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Siguiente banner"
              className="w-10 h-10 rounded-full border border-white/30 bg-black/30 text-white/80 hover:bg-sky-500 hover:border-sky-500 hover:text-white transition-all duration-200 flex items-center justify-center backdrop-blur-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="absolute bottom-6 md:bottom-8 inset-x-0 md:inset-x-auto md:right-20 z-20 flex justify-center items-center gap-2">
            {banners.map((banner, index) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => goTo(index)}
                aria-label={`Ir al banner ${index + 1}`}
                aria-current={index === activeIndex}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === activeIndex
                    ? 'w-8 bg-sky-400'
                    : 'w-2 bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
