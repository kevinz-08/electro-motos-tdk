'use client'

import { useEffect, useRef, useState } from 'react'

interface Testimonial {
  quote: string
  author: string
  role: string
  rating: number
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote: 'Compré un sistema eléctrico completo y llegó en 2 días. Quedó perfecto en mi moto.',
    author: 'Carlos Mendoza',
    role: 'Cliente verificado',
    rating: 5,
  },
  {
    quote: 'El mejor taller de repuestos en Bucaramanga. Me asesoraron para escoger la llanta correcta.',
    author: 'Andrea Ruiz',
    role: 'Cliente verificado',
    rating: 5,
  },
  {
    quote: 'Tienen repuestos que no encontré en ningún otro lado. El envío fue rápido y seguro.',
    author: 'Miguel Ángel P.',
    role: 'Cliente verificado',
    rating: 5,
  },
  {
    quote: 'Servicio técnico excelente. Diagnosticaron mi moto y consiguieron el repuesto original.',
    author: 'Laura Jiménez',
    role: 'Cliente verificado',
    rating: 5,
  },
]

const STATS = [
  { value: '500+', label: 'Clientes satisfechos' },
  { value: '1,200+', label: 'Repuestos vendidos' },
  { value: '98%', label: 'Recomendación' },
  { value: '2-5 días', label: 'Tiempo de entrega' },
]

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`w-4 h-4 ${i < rating ? 'text-amber-400' : 'text-gray-300'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="shrink-0 w-[300px] md:w-[340px] bg-white border border-gray-200 rounded-2xl p-6 select-none">
      <StarRating rating={testimonial.rating} />
      <blockquote className="text-sm text-gray-700 mt-3 leading-relaxed">
        &ldquo;{testimonial.quote}&rdquo;
      </blockquote>
      <div className="mt-4 pt-3 border-t border-gray-100">
        <p className="font-semibold text-sm text-gray-900">{testimonial.author}</p>
        <p className="text-xs text-gray-400">{testimonial.role}</p>
      </div>
    </div>
  )
}

export function SocialProof() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll)
    return () => el.removeEventListener('scroll', checkScroll)
  }, [])

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const amount = dir === 'left' ? -340 : 340
    el.scrollBy({ left: amount, behavior: 'smooth' })
  }

  return (
    <section className="py-20 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
            Lo que dicen nuestros clientes
          </h2>
          <p className="text-gray-500 mt-3 max-w-md mx-auto">
            Miles de motociclistas confían en nosotros
          </p>
        </div>

        <div className="relative">
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scroll('left')}
              aria-label="Anteriores"
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-10 h-10 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-all hidden md:flex"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory"
          >
            {TESTIMONIALS.map((t) => (
              <div key={t.author} className="snap-start">
                <TestimonialCard testimonial={t} />
              </div>
            ))}
          </div>

          {canScrollRight && (
            <button
              type="button"
              onClick={() => scroll('right')}
              aria-label="Siguientes"
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-10 h-10 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-all hidden md:flex"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl md:text-4xl font-black text-sky-600 tracking-tight">
                {stat.value}
              </p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
