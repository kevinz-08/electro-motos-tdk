'use client'

/**
 * Tarjeta de un kit (docs/seo/plan-kits.md). La usan el hub de modelo, `/kits`
 * y `/kits/[slug]`.
 *
 * "Agregar kit al carrito" recorre sus productos y llama a `addItem()` una vez
 * por cada uno, con la cantidad definida en el kit — nunca un "ítem de carrito
 * tipo kit": el checkout, el stock y el pago siguen viendo productos normales.
 */
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'sonner'
import type { Product } from '@h2r/domain'
import { useCart } from '@/lib/cart'
import { cloudinaryUrl } from '@/lib/cloudinary'
import { toPesos, track } from '@/lib/analytics'
import { PriceTag } from '@/components/store/PriceTag'
import type { KitSummary } from '@/lib/kits'

/** El carrito guarda el producto completo; una fila de kit trae solo lo necesario. */
function toCartProduct(item: KitSummary['items'][number]): Product {
  return {
    id: item.productId,
    name: item.name,
    slug: item.slug,
    description: '',
    price: item.price,
    compareAtPrice: null,
    stock: item.stock,
    sku: item.sku,
    images: item.image ? [item.image] : [],
    isActive: true,
    weightKg: null,
    heightCm: null,
    widthCm: null,
    lengthCm: null,
    categoryId: '',
    createdAt: new Date(0),
    updatedAt: new Date(0),
  }
}

export function KitCard({ kit, className = '' }: { kit: KitSummary; className?: string }) {
  const { addItem } = useCart()
  const hasDiscount = kit.discountCents > 0

  const handleAdd = () => {
    for (const item of kit.items) addItem(toCartProduct(item), item.quantity)
    track('add_to_cart', {
      currency: 'COP',
      value: toPesos(kit.price),
      items: kit.items.map((i) => ({
        item_id: i.sku, item_name: i.name, price: toPesos(i.price), quantity: i.quantity, item_list_name: 'kit',
      })),
    })
    toast.success('Kit agregado al carrito', { description: kit.name })
  }

  return (
    <div className={`rounded-2xl border border-gray-200 p-5 flex flex-col ${className}`}>
      <Link href={`/kits/${kit.slug}`} className="font-bold text-gray-900 hover:text-sky-600 leading-snug">
        {kit.name}
      </Link>
      {kit.description && <p className="mt-1 text-sm text-gray-500 line-clamp-2">{kit.description}</p>}

      <ul className="mt-3 flex flex-wrap gap-2">
        {kit.items.map((item) => (
          <li key={item.productId} className="flex items-center gap-1.5 rounded-full border border-gray-100 bg-gray-50 pl-1 pr-2.5 py-1 text-xs text-gray-600">
            <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-white">
              {item.image ? (
                <Image src={cloudinaryUrl(item.image, 'thumbnail')} alt="" fill sizes="24px" className="object-contain" />
              ) : null}
            </span>
            {item.name}{item.quantity > 1 && ` ×${item.quantity}`}
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-4 flex items-center justify-between gap-3">
        <div>
          <PriceTag price={kit.price} compareAtPrice={hasDiscount ? kit.itemsTotal : null} size="md" />
          {kit.availableUnits <= 3 && (
            <p className="mt-0.5 text-xs text-amber-600 font-medium">Solo {kit.availableUnits} disponible{kit.availableUnits === 1 ? '' : 's'}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="shrink-0 rounded-xl bg-sky-400 px-4 py-2.5 text-sm font-bold text-black hover:bg-sky-500 hover:text-white active:scale-95 transition-all"
        >
          Agregar kit
        </button>
      </div>
    </div>
  )
}
