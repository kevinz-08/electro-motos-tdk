'use client'

/**
 * Carrusel horizontal de reseñas reales de la home. Solo presentación y scroll:
 * los datos llegan ya listos desde `SocialProof` (Server Component).
 */
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { StarRating } from '@/components/store/ProductTrustSignals'

export interface CarouselReview {
  id: string
  rating: number
  comment: string
  authorName: string
  createdAt: string
  /** "Le sirvió a una Suzuki DR150 · Cali" — null si no declaró moto. */
  installedLine: string | null
  product: { name: string; slug: string }
}

function ReviewCard({ review }: { review: CarouselReview }) {
  return (
    <div className="shrink-0 w-[300px] md:w-[340px] bg-white border border-gray-200 rounded-2xl p-6 flex flex-col">
      <StarRating average={review.rating} />
      <blockquote className="text-sm text-gray-700 mt-3 leading-relaxed line-clamp-6">
        &ldquo;{review.comment}&rdquo;
      </blockquote>
      {review.installedLine && (
        <p className="mt-3 text-xs font-medium text-green-700">🏍️ {review.installedLine}</p>
      )}
      <div className="mt-auto pt-4">
        <div className="pt-3 border-t border-gray-100">
          <p className="font-semibold text-sm text-gray-900">{review.authorName}</p>
          <p className="text-xs text-gray-400">
            Compra verificada ·{' '}
            <Link href={`/producto/${review.product.slug}`} className="underline hover:text-sky-600 transition-colors">
              {review.product.name}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export function ReviewsCarousel({ reviews }: { reviews: CarouselReview[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const check = () => {
      setCanScrollLeft(el.scrollLeft > 0)
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
    }
    check()
    el.addEventListener('scroll', check)
    window.addEventListener('resize', check)
    return () => {
      el.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [reviews.length])

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -340 : 340, behavior: 'smooth' })
  }

  return (
    <div className="relative">
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scroll('left')}
          aria-label="Anteriores"
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-10 h-10 rounded-full bg-white shadow-md border border-gray-200 items-center justify-center text-gray-600 hover:bg-gray-50 transition-all hidden md:flex"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      <div ref={scrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory">
        {reviews.map((r) => (
          <div key={r.id} className="snap-start flex">
            <ReviewCard review={r} />
          </div>
        ))}
      </div>

      {canScrollRight && (
        <button
          type="button"
          onClick={() => scroll('right')}
          aria-label="Siguientes"
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-10 h-10 rounded-full bg-white shadow-md border border-gray-200 items-center justify-center text-gray-600 hover:bg-gray-50 transition-all hidden md:flex"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  )
}
