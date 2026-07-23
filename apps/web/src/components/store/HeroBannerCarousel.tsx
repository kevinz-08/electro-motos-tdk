'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { cloudinaryUrl, IMAGE_BLUR_PLACEHOLDER } from '@/lib/cloudinary'

type BannerItem = {
  id: string
  src: string
  title: string
  description: string
  cta?: { label: string; href: string }
}

interface HeroBannerCarouselProps {
  banners: BannerItem[]
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

  const canRender = useMemo(() => total > 0, [total])
  if (!canRender) return null

  const active = banners[activeIndex]!

  return (
    <section
      className="relative h-[78vh] min-h-[520px] max-h-[860px] overflow-hidden bg-black text-white"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {banners.map((banner, index) => (
        <div
          key={banner.id}
          className="absolute inset-0 transition-all duration-700"
          style={{
            opacity: index === activeIndex ? 1 : 0,
            transform: `scale(${index === activeIndex ? 1 : 1.05})`,
            transition: 'opacity 0.7s ease-out, transform 7s ease-out',
          }}
          aria-hidden={index !== activeIndex}
        >
          <Image
            src={cloudinaryUrl(banner.src, 'hero')}
            alt={banner.title}
            fill
            className="object-cover"
            sizes="100vw"
            priority={index === 0}
            placeholder="blur"
            blurDataURL={IMAGE_BLUR_PLACEHOLDER}
          />
        </div>
      ))}

      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/20" />

      <div className="relative z-10 h-full flex flex-col justify-end pb-28 md:pb-32 px-6 md:px-20 lg:px-24 max-w-2xl">
        <p className="text-sky-400 text-sm font-semibold tracking-[0.2em] uppercase mb-3">
          H2R Online Store
        </p>
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-black leading-[0.95] mb-4 tracking-tight">
          {active.title}
        </h1>
        <p className="text-white/70 text-base md:text-lg max-w-lg mb-7 leading-relaxed">
          {active.description}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={active.cta?.href ?? '/catalogo'}
            className="inline-flex items-center gap-2 bg-sky-400 text-black font-bold px-7 py-3.5 rounded-xl text-base hover:bg-sky-300 hover:scale-[1.03] active:scale-95 transition-all duration-200 shadow-lg shadow-sky-500/20"
          >
            {active.cta?.label ?? 'Ver catálogo'}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <Link
            href="/catalogo?showAll=true"
            className="inline-flex items-center gap-2 border border-white/30 text-white font-semibold px-7 py-3.5 rounded-xl text-base hover:bg-white/10 hover:border-white/50 transition-all duration-200"
          >
            Explorar todo
          </Link>
        </div>
      </div>

      <div className="absolute bottom-8 left-6 md:left-20 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={goPrev}
          aria-label="Banner anterior"
          className="w-10 h-10 rounded-full border border-white/30 bg-black/30 text-white/70 hover:bg-sky-500 hover:border-sky-500 hover:text-white transition-all duration-200 flex items-center justify-center backdrop-blur-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={goNext}
          aria-label="Siguiente banner"
          className="w-10 h-10 rounded-full border border-white/30 bg-black/30 text-white/70 hover:bg-sky-500 hover:border-sky-500 hover:text-white transition-all duration-200 flex items-center justify-center backdrop-blur-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="absolute bottom-8 right-6 md:right-20 z-20 flex items-center gap-2">
        {banners.map((banner, index) => (
          <button
            key={banner.id}
            type="button"
            onClick={() => goTo(index)}
            aria-label={`Ir al banner ${index + 1}`}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === activeIndex
                ? 'w-8 bg-sky-400'
                : 'w-2 bg-white/40 hover:bg-white/70'
            }`}
          />
        ))}
      </div>
    </section>
  )
}
