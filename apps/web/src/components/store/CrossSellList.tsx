'use client'

/**
 * Lista de venta cruzada (docs/seo/plan-venta-cruzada.md). La usan la ficha de
 * producto y el carrito.
 *
 * Recibe las sugerencias ya visibles (activas, con stock) y aplica en el cliente
 * el filtro por la moto del comprador — `isCrossSellCompatible`: se oculta lo
 * que tiene compatibilidad verificada y ninguna es de su moto; lo que no tiene
 * fitments cargados se muestra. Lee la cookie de "mi moto" igual que
 * `CompatibilityBadge` (mismo `useSyncExternalStore` y mismo snapshot estable),
 * para que la ficha siga siendo estática.
 *
 * Si tras filtrar no queda nada, no pinta nada: ni título ni espacio.
 */
import { useEffect, useRef, useSyncExternalStore } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'sonner'
import { MAX_CROSS_SELLS, isCrossSellCompatible, type Product } from '@h2r/domain'
import { useCart } from '@/lib/cart'
import { cloudinaryUrl } from '@/lib/cloudinary'
import { toGaItem, toPesos, track } from '@/lib/analytics'
import { readMyMotorcycle, subscribeToMyMotorcycle, type MyMotorcycle } from '@/lib/my-motorcycle'
import { formatCOP } from '@/components/store/PriceTag'
import type { CrossSellSuggestion } from '@/lib/cross-sell'

const noneOnServer = (): MyMotorcycle | null => null

/**
 * La tienda guarda el producto completo en el carrito; una sugerencia trae solo
 * lo necesario para pintarla y agregarla. Los campos que el carrito no usa se
 * rellenan de forma neutra.
 */
function toCartProduct(s: CrossSellSuggestion): Product {
  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    description: '',
    price: s.price,
    compareAtPrice: s.compareAtPrice,
    stock: s.stock,
    sku: s.sku,
    images: s.images,
    isActive: true,
    weightKg: null,
    heightCm: null,
    widthCm: null,
    lengthCm: null,
    categoryId: s.categoryId,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  }
}

interface Props {
  suggestions: CrossSellSuggestion[]
  heading: string
  /** Nombre de la lista para GA4: "venta_cruzada_ficha" o "venta_cruzada_carrito". */
  listName: string
  className?: string
}

export function CrossSellList({ suggestions, heading, listName, className = '' }: Props) {
  const moto = useSyncExternalStore(subscribeToMyMotorcycle, readMyMotorcycle, noneOnServer)
  const { addItem } = useCart()

  const visible = suggestions
    .filter((s) => isCrossSellCompatible(s.models, moto))
    .slice(0, MAX_CROSS_SELLS)

  // view_item_list una sola vez por conjunto mostrado (no en cada re-render).
  const shownKey = visible.map((s) => s.id).join('|')
  const reported = useRef('')
  useEffect(() => {
    if (!shownKey || reported.current === shownKey) return
    if (
      track('view_item_list', {
        item_list_name: listName,
        items: visible.map((s) => ({ ...toGaItem(s), item_list_name: listName })),
      })
    ) {
      reported.current = shownKey
    }
    // `visible` se deriva de `shownKey`; reportar solo cuando cambia el conjunto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownKey, listName])

  if (visible.length === 0) return null

  return (
    <section aria-label={heading} className={className}>
      <h2 className="text-base font-bold text-gray-900 mb-3">{heading}</h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {visible.map((s) => {
          const image = s.images[0]
          return (
            <li key={s.id} className="flex gap-3 rounded-xl border border-gray-200 p-3">
              <Link
                href={`/producto/${s.slug}`}
                onClick={() =>
                  track('select_item', {
                    item_list_name: listName,
                    items: [{ ...toGaItem(s), item_list_name: listName }],
                  })
                }
                className="relative w-16 h-16 shrink-0 overflow-hidden rounded-lg bg-gray-50"
              >
                {image ? (
                  <Image src={cloudinaryUrl(image, 'thumbnail')} alt={s.name} fill sizes="64px" className="object-contain p-1" />
                ) : (
                  <span className="flex h-full items-center justify-center text-xl text-gray-300">📦</span>
                )}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <Link href={`/producto/${s.slug}`} className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900 hover:text-sky-600">
                  {s.name}
                </Link>
                {s.reason && <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{s.reason}</p>}
                <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                  <span className="text-sm font-black text-gray-900">{formatCOP(s.price)}</span>
                  <button
                    type="button"
                    onClick={() => {
                      addItem(toCartProduct(s), 1)
                      track('add_to_cart', {
                        currency: 'COP',
                        value: toPesos(s.price),
                        items: [{ ...toGaItem(s, 1), item_list_name: listName }],
                      })
                      toast.success('Agregado al carrito', { description: s.name })
                    }}
                    className="rounded-lg bg-sky-400 px-3 py-1.5 text-xs font-bold text-black hover:bg-sky-500 hover:text-white active:scale-95 transition-all"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
