'use client'

import { useEffect, useMemo, useState } from 'react'

type BannerItem = {
  src: string
  title: string
  description: string
}

interface HeroBannerCarouselProps {
  banners: BannerItem[]
}

export function HeroBannerCarousel({ banners }: HeroBannerCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const active = banners[activeIndex]

  const canRender = useMemo(() => banners.length > 0, [banners.length])
  if (!canRender) return null

  const goPrev = () => setActiveIndex((prev) => (prev - 1 + banners.length) % banners.length)
  const goNext = () => setActiveIndex((prev) => (prev + 1) % banners.length)

  useEffect(() => {
    if (banners.length <= 1) return
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % banners.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [banners.length])

  return (
    <section className="relative h-[78vh] min-h-[520px] max-h-[860px] overflow-hidden bg-black text-white">
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-500"
        style={{ backgroundImage: `url('${active.src}')` }}
        aria-hidden
      />

      <div className="absolute inset-0 bg-linear-to-r from-black/80 via-black/40 to-transparent" />

      <div className="relative z-10 h-full flex flex-col justify-end pb-28 md:pb-32 px-8 md:px-20 max-w-3xl">
        <p className="text-sky-300 text-sm font-semibold tracking-widest uppercase mb-4">
          H2r Online Store
        </p>
        <h1 className="text-4xl md:text-6xl font-black leading-none mb-6">{active.title}</h1>
        <p className="text-white/80 text-base md:text-lg tracking-wide max-w-xl">
          {active.description}
        </p>
      </div>

      <div className="absolute bottom-6 left-8 md:left-20 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={goPrev}
          aria-label="Banner anterior"
          className="w-10 h-10 rounded-full border border-white/40 bg-black/40 text-white hover:bg-sky-500 hover:border-sky-500 transition-colors flex items-center justify-center"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={goNext}
          aria-label="Siguiente banner"
          className="w-10 h-10 rounded-full border border-white/40 bg-black/40 text-white hover:bg-sky-500 hover:border-sky-500 transition-colors flex items-center justify-center"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="absolute bottom-6 right-8 md:right-20 z-20 flex items-center gap-2">
        {banners.map((banner, index) => (
          <button
            key={banner.src}
            type="button"
            onClick={() => setActiveIndex(index)}
            aria-label={`Ir al banner ${index + 1}`}
            className={`h-2.5 rounded-full transition-all ${index === activeIndex ? 'w-7 bg-sky-400' : 'w-2.5 bg-white/50 hover:bg-white/80'}`}
          />
        ))}
      </div>
    </section>
  )
}
