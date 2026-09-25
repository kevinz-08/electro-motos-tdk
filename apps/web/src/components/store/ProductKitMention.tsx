/**
 * "Este producto está en el Kit NKD 125" — mención en la ficha de producto
 * (docs/seo/plan-kits.md). Server Component, enlace simple a `/kits/[slug]`.
 * Sin kits que incluyan este producto, no se pinta nada.
 */
import Link from 'next/link'
import { getCachedKitsContainingProduct } from '@/lib/cache'

export async function ProductKitMention({ productId, className = '' }: { productId: string; className?: string }) {
  // Complemento opcional: si la lectura falla (p. ej. migración sin aplicar)
  // la ficha se sirve igual, sin esta mención.
  let kits: Awaited<ReturnType<typeof getCachedKitsContainingProduct>> = []
  try {
    kits = await getCachedKitsContainingProduct(productId)
  } catch (e) {
    console.error('[kits] no se pudo leer la mención de kits del producto', e)
  }
  if (kits.length === 0) return null

  return (
    <div className={`rounded-xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-sm ${className}`}>
      <span aria-hidden="true">📦</span>{' '}
      {kits.length === 1 ? (
        <>
          Este producto está en el{' '}
          <Link href={`/kits/${kits[0]!.slug}`} className="font-semibold text-sky-700 underline hover:text-sky-800">
            {kits[0]!.name}
          </Link>
          .
        </>
      ) : (
        <>
          Este producto está en {kits.length} kits:{' '}
          {kits.map((k, i) => (
            <span key={k.slug}>
              <Link href={`/kits/${k.slug}`} className="font-semibold text-sky-700 underline hover:text-sky-800">
                {k.name}
              </Link>
              {i < kits.length - 1 ? ', ' : '.'}
            </span>
          ))}
        </>
      )}
    </div>
  )
}
