'use client'

/**
 * Galería de imágenes para la página de detalle de producto.
 *
 * Comportamiento:
 *   - Muestra hasta 4 imágenes del producto.
 *   - Imagen principal grande con fade-in al cambiar.
 *   - Botones ← → sobre la imagen principal para navegar (visible si hay >1 imagen).
 *   - Fila de miniaturas debajo; la activa tiene borde azul.
 *   - Si el producto no tiene imágenes muestra un placeholder SVG.
 *
 * Se usa en /producto/[slug]/page.tsx (Server Component) pasando
 * las URLs de imágenes como prop string[].
 */
import { useState, useCallback } from 'react'
import Image from 'next/image'
import { cloudinaryUrl } from '@/lib/cloudinary'

interface Props {
  images: string[]
  productName: string
}

export function ProductImageGallery({ images, productName }: Props) {
  // Limitar a 4 imágenes máximo
  const imgs = images.slice(0, 4)
  const [current, setCurrent] = useState(0)
  // Key para forzar re-render y activar animate-fadeIn al cambiar de imagen
  const [fadeKey, setFadeKey] = useState(0)

  const goTo = useCallback((index: number) => {
    if (index === current) return
    setCurrent(index)
    setFadeKey(k => k + 1)
  }, [current])

  const prev = useCallback(() => {
    goTo((current - 1 + imgs.length) % imgs.length)
  }, [current, imgs.length, goTo])

  const next = useCallback(() => {
    goTo((current + 1) % imgs.length)
  }, [current, imgs.length, goTo])

  // ── Sin imágenes ──────────────────────────────────────────────────────────
  if (imgs.length === 0) {
    return (
      <div className="aspect-square bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center text-gray-300">
        <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    )
  }

  const hasMultiple = imgs.length > 1

  return (
    <div className="flex flex-col gap-3">

      {/* ── Imagen principal ─────────────────────────────────────────── */}
      <div className="relative aspect-square bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">

        {/* Imagen con fade-in al cambiar */}
        <Image
          key={fadeKey}
          src={cloudinaryUrl(imgs[current], 'detail')}
          alt={`${productName} — imagen ${current + 1}`}
          fill
          className="object-contain p-6 animate-fadeIn"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority={current === 0}
        />

        {/* Botones de navegación (solo con >1 imagen) */}
        {hasMultiple && (
          <>
            <button
              onClick={prev}
              aria-label="Imagen anterior"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:shadow-lg active:scale-90 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={next}
              aria-label="Imagen siguiente"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:shadow-lg active:scale-90 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Indicador de posición (puntitos en la parte inferior) */}
        {hasMultiple && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
            {imgs.map((_, i) => (
              <span
                key={i}
                className={`block h-1.5 rounded-full transition-all duration-300 ${i === current ? 'w-5 bg-gray-700' : 'w-1.5 bg-gray-300'}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Miniaturas ───────────────────────────────────────────────── */}
      {hasMultiple && (
        <div className="flex gap-2">
          {imgs.map((img, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Ver imagen ${i + 1}`}
              className={`relative flex-1 aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                i === current
                  ? 'border-blue-500 shadow-sm'
                  : 'border-gray-100 hover:border-gray-300'
              }`}
            >
              <Image
                src={cloudinaryUrl(img, 'thumbnail')}
                alt={`${productName} — miniatura ${i + 1}`}
                fill
                className="object-contain p-2"
                sizes="80px"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
