/**
 * Fila a ancho completo de un kit para la home ("Conoce los Kits para Motos").
 *
 * Server Component: toda la fila es un enlace a `/kits/[slug]`; el kit se agrega
 * al carrito desde su página (ahí se ve qué incluye). Muestra la imagen del kit
 * con `<picture>` (variante mobile < 768 px, desktop desde 768 px). Si el kit no
 * tiene imagen propia, `kit.imageIsFallback` indica que es la foto del primer
 * producto: se muestra contenida sobre fondo claro en vez de recortada.
 */
import Link from 'next/link'
import { cloudinaryUrl } from '@/lib/cloudinary'
import { PriceTag } from '@/components/store/PriceTag'
import type { KitSummary } from '@/lib/kits'

export function KitFeatureRow({ kit, reverse = false }: { kit: KitSummary; reverse?: boolean }) {
  const hasDiscount = kit.discountCents > 0
  const fit = kit.imageIsFallback ? 'object-contain p-6' : 'object-cover'
  const desktopSrc = cloudinaryUrl(kit.imageDesktop, 'hero')
  const mobileSrc = cloudinaryUrl(kit.imageMobile, 'heroMobile')

  return (
    <Link
      href={`/kits/${kit.slug}`}
      className="group grid grid-cols-1 md:grid-cols-[3fr_2fr] overflow-hidden rounded-2xl border border-gray-200 bg-white hover:border-sky-300 hover:shadow-lg transition-all"
    >
      <div className={`relative aspect-square md:aspect-auto md:min-h-[260px] bg-gray-50 ${reverse ? 'md:order-2' : ''}`}>
        {desktopSrc ? (
          <picture>
            <source media="(min-width: 768px)" srcSet={desktopSrc} />
            <img
              src={mobileSrc || desktopSrc}
              alt={kit.name}
              loading="lazy"
              className={`absolute inset-0 h-full w-full ${fit} transition-transform duration-500 group-hover:scale-[1.03]`}
            />
          </picture>
        ) : null}
      </div>

      <div className="flex flex-col justify-center gap-3 p-6 md:p-8">
        <h3 className="text-xl md:text-2xl font-bold text-gray-900 leading-snug group-hover:text-sky-600 transition-colors">
          {kit.name}
        </h3>
        {kit.description && <p className="text-sm text-gray-500 line-clamp-3">{kit.description}</p>}
        <p className="text-xs text-gray-400">
          Incluye {kit.items.length} productos
        </p>
        <PriceTag price={kit.price} compareAtPrice={hasDiscount ? kit.itemsTotal : null} size="md" />
        <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-xl bg-sky-400 px-5 py-2.5 text-sm font-bold text-black group-hover:bg-sky-500 group-hover:text-white transition-colors">
          Ver kit
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  )
}
