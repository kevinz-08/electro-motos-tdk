'use client'

/**
 * Barra fija "Agregar al carrito" para móvil (Fase 4, ítem 1, fricción C1).
 *
 * La ficha es larga y el botón de compra queda arriba del todo: al bajar a la
 * descripción o a las reseñas el comprador pierde la acción. Esta barra aparece
 * solo cuando el bloque de compra real (`targetId`) sale de la pantalla POR
 * ARRIBA, y desaparece al volver a verse, así nunca hay dos botones a la vez.
 *
 * Solo móvil (`md:hidden`): en escritorio la ficha cabe en una pantalla. No se
 * pinta con el producto agotado. Como la ficha es estática, la barra se monta al
 * hidratar y no cambia el HTML prerenderizado.
 */
import { useEffect, useState } from 'react'
import { Product } from '@h2r/domain'
import { toast } from 'sonner'
import { useCart } from '@/lib/cart'
import { formatCOP } from '@/components/store/PriceTag'
import { toGaItem, toPesos, track } from '@/lib/analytics'

export function StickyBuyBar({ product, targetId }: { product: Product; targetId: string }) {
  const { addItem } = useCart()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const target = document.getElementById(targetId)
    if (!target || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Visible solo si el bloque ya pasó por arriba: no aparece si el
        // comprador aún no llegó a él (p. ej. carga con scroll restaurado abajo
        // sí, pero nunca en la parte superior de la página).
        setVisible(!entry!.isIntersecting && entry!.boundingClientRect.top < 0)
      },
      { threshold: 0 },
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [targetId])

  if (product.stock === 0) return null

  return (
    <div
      aria-hidden={!visible}
      className={`md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.08)] transition-transform duration-200 ${
        visible ? 'translate-y-0' : 'translate-y-full pointer-events-none'
      }`}
    >
      {/* pr-16: deja libre el botón flotante de WhatsApp (fixed, z-50, abajo a la derecha) */}
      <div className="flex items-center gap-3 pr-16">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-gray-500">{product.name}</p>
          <p className="text-base font-black text-gray-900">{formatCOP(product.price)}</p>
        </div>
        <button
          type="button"
          tabIndex={visible ? 0 : -1}
          onClick={() => {
            addItem(product, 1)
            track('add_to_cart', {
              currency: 'COP',
              value: toPesos(product.price * 1),
              items: [toGaItem(product, 1)],
            })
            toast.success('Agregado al carrito', { description: product.name })
          }}
          className="shrink-0 rounded-xl bg-sky-400 px-5 py-3 text-sm font-bold text-black hover:bg-sky-500 hover:text-white active:scale-95 transition-all"
        >
          Agregar al carrito
        </button>
      </div>
    </div>
  )
}
