/**
 * Bloque de venta cruzada de la ficha de producto (Server Component).
 *
 * Lee las sugerencias cacheadas y elige el título con `pickCrossSellHeading`,
 * que es determinista por producto: varía entre fichas pero no cambia entre
 * cargas ni descuadra el HTML prerenderizado con el del cliente.
 * Sin sugerencias visibles devuelve `null`: la ficha queda como estaba.
 */
import { pickCrossSellHeading } from '@h2r/domain'
import { getCachedCrossSells } from '@/lib/cache'
import { CrossSellList } from '@/components/store/CrossSellList'

export async function CrossSellBlock({ productId, className = '' }: { productId: string; className?: string }) {
  // La venta cruzada es un complemento: si la lectura falla (p. ej. migración sin
  // aplicar) la ficha se sirve igual, sin el bloque. Un error no queda en caché.
  let suggestions: Awaited<ReturnType<typeof getCachedCrossSells>> = []
  try {
    suggestions = await getCachedCrossSells(productId)
  } catch (e) {
    console.error('[cross-sell] no se pudieron leer las sugerencias', e)
  }
  if (suggestions.length === 0) return null

  return (
    <CrossSellList
      suggestions={suggestions}
      heading={pickCrossSellHeading(productId)}
      listName="venta_cruzada_ficha"
      className={className}
    />
  )
}
