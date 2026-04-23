'use client'

/**
 * Tarjeta de producto — diseño minimalista inspirado en tiendas de referencia.
 *
 * Layout:
 *   - Imagen cuadrada que ocupa todo el ancho, sin padding lateral.
 *   - Al hacer hover: si el producto tiene ≥2 imágenes, hace crossfade
 *     a la segunda imagen (transición CSS pura, sin estado).
 *     Si solo hay una imagen, aplica scale-105 como antes.
 *   - Botón circular de carrito aparece en la esquina inferior derecha al hover.
 *   - Debajo de la imagen: nombre → precio. Sin elementos extra.
 *
 * Badges:
 *   - stock = 0   → overlay "Agotado" semitransparente sobre la imagen.
 *   - 1–5 stock   → chip "Últimas N" en la esquina superior izquierda.
 *
 * El componente es 'use client' porque CartHoverButton usa useCart.
 */
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Product } from '@h2r/domain'
import { useCart } from '@/lib/cart'
import { cloudinaryUrl } from '@/lib/cloudinary'

interface ProductCardProps {
  product: Product
}

function formatCOP(cents: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

/**
 * Botón flotante de carrito con animación carrito → chulito.
 *
 * Estados:
 *   idle    → ícono de carrito (opacidad 0, sube al hacer hover en la card)
 *   added   → fondo verde + chulito animado con stroke-dashoffset
 *   idle    → vuelve al carrito después de 1.8 s
 *
 * El chulito usa un <path> con stroke-dasharray/dashoffset para el efecto
 * de "dibujado" (draw-on animation) definido con @keyframes en globals.css.
 */
function CartHoverButton({ product }: { product: Product }) {
  const { addItem }    = useCart()
  const [added, setAdded] = useState(false)
  const timerRef       = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Limpiar el timer si el componente se desmonta
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  if (product.stock === 0) return null

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (added) return          // evitar doble click durante animación
    addItem(product, 1)
    setAdded(true)
    timerRef.current = setTimeout(() => setAdded(false), 1800)
  }

  return (
    <button
      onClick={handleClick}
      aria-label={added ? 'Producto añadido' : `Agregar ${product.name} al carrito`}
      className={`absolute bottom-3 right-3 z-10 w-10 h-10 rounded-full shadow-lg flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 active:scale-90 transition-all duration-200 ${added ? 'bg-green-500 text-white scale-110' : 'bg-white text-gray-800 hover:bg-blue-600 hover:text-white'}`}
    >
      {added ? (
        /* Chulito con animación de "dibujado" */
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M4 13l5 5L20 7"
            style={{
              strokeDasharray: 28,
              strokeDashoffset: 0,
              animation: 'checkDraw 0.35s ease-out forwards',
            }}
          />
        </svg>
      ) : (
        /* Carrito */
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.5 6h13M7 13L5.4 5M10 21a1 1 0 100-2 1 1 0 000 2zm7 0a1 1 0 100-2 1 1 0 000 2z" />
        </svg>
      )}
    </button>
  )
}

export function ProductCard({ product }: ProductCardProps) {
  // Máximo 4 imágenes; la segunda se muestra en hover (crossfade CSS puro)
  const images       = product.images.slice(0, 4)
  const firstImage   = images[0] ? cloudinaryUrl(images[0], 'card') : null
  const secondImage  = images[1] ? cloudinaryUrl(images[1], 'card') : null
  const hasSecond    = !!secondImage

  const isLowStock   = product.stock > 0 && product.stock <= 5
  const isOutOfStock = product.stock === 0

  return (
    <div className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-300">

      {/* ── Imagen ────────────────────────────────────────────────── */}
      <Link
        href={`/producto/${product.slug}`}
        className="relative block aspect-square overflow-hidden bg-gray-50 shrink-0"
      >
        {firstImage ? (
          <>
            {/* Imagen principal: se oculta en hover si hay segunda imagen */}
            <Image
              src={firstImage}
              alt={product.name}
              fill
              className={`object-contain p-4 transition-all duration-500 ${hasSecond ? 'group-hover:opacity-0' : 'group-hover:scale-105'}`}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />

            {/* Segunda imagen: crossfade en hover */}
            {hasSecond && (
              <Image
                src={secondImage!}
                alt={`${product.name} — vista 2`}
                fill
                className="object-contain p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                loading="lazy"
              />
            )}

            {/* Indicador de múltiples fotos (puntitos) */}
            {images.length > 1 && (
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 pointer-events-none">
                {images.map((_, i) => (
                  <span
                    key={i}
                    className={`block rounded-full transition-all duration-500 ${i === 0 ? 'w-3 h-1.5 bg-gray-400 group-hover:w-1.5 group-hover:bg-gray-300' : 'w-1.5 h-1.5 bg-gray-300 group-hover:bg-gray-500'}`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-300">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs">Sin imagen</span>
          </div>
        )}

        {/* Overlay agotado */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="bg-gray-800 text-white text-xs font-bold px-3 py-1.5 rounded-full tracking-wide">
              Agotado
            </span>
          </div>
        )}

        {/* Badge últimas unidades */}
        {isLowStock && (
          <div className="absolute top-2.5 left-2.5">
            <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wide shadow-sm">
              Últimas {product.stock}
            </span>
          </div>
        )}

        {/* Botón carrito en hover */}
        <CartHoverButton product={product} />
      </Link>

      {/* ── Info ──────────────────────────────────────────────────── */}
      <div className="flex flex-col px-4 pt-3 pb-4 gap-1">
        {/* SKU discreto */}
        <p className="text-[10px] text-gray-400 font-mono tracking-wide uppercase">
          {product.sku}
        </p>

        {/* Nombre */}
        <Link href={`/producto/${product.slug}`}>
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 hover:text-blue-600 transition-colors leading-snug">
            {product.name}
          </h3>
        </Link>

        {/* Precio */}
        <p className="text-base font-black text-gray-900 mt-1 tracking-tight">
          {formatCOP(product.price)}
        </p>
      </div>
    </div>
  )
}
