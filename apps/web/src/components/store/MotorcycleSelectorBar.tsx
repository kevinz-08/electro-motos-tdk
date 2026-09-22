/**
 * Barra del selector "¿Qué moto tienes?" bajo el navbar (docs/seo/, Fase 2).
 *
 * Server Component: carga el catálogo de motos (cacheado 1 h con el tag
 * `fitments`) y se lo pasa al selector, que es cliente. Así el desplegable se
 * abre instantáneamente, sin fetch, y la barra no obliga a ninguna página a
 * volverse dinámica — no lee cookies en el servidor.
 *
 * NO SE RENDERIZA SI NO HAY COMPATIBILIDADES VERIFICADAS, y esta es la parte
 * importante: el catálogo de motos (marcas y modelos) se puede cargar antes que
 * las compatibilidades, y de hecho así está hoy — 32 modelos, 0 fitments. En ese
 * estado, un cliente que eligiera su moto vería "No confirmado para tu NKD 125"
 * en **todos** los productos, porque no hay ni un solo fitment con el que
 * comparar. Eso siembra duda justo donde el sitio intenta dar confianza: es peor
 * que no ofrecer el selector.
 *
 * Así que la barra aparece sola, sin tocar código, en cuanto se cargue la
 * primera compatibilidad verificada (tarea H-02). El contador está cacheado una
 * hora con el tag `fitments`, así que la importación del CSV lo refresca.
 */
import { getCachedMotorcycleCatalog, getCachedVerifiedFitmentCount } from '@/lib/cache'
import { MotorcycleSelector } from './MotorcycleSelector'

export async function MotorcycleSelectorBar() {
  const [{ brands, models }, verifiedFitments] = await Promise.all([
    getCachedMotorcycleCatalog(),
    getCachedVerifiedFitmentCount(),
  ])

  // Sin catálogo de motos no hay nada que elegir; sin compatibilidades
  // verificadas, elegir no sirve de nada (ver el comentario de arriba).
  if (brands.length === 0 || models.length === 0) return null
  if (verifiedFitments === 0) return null

  return (
    <div className="border-b border-white/10 bg-black/95">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <p className="text-xs text-white/50">
          Dinos tu moto y te marcamos qué repuestos le sirven.
        </p>
        <MotorcycleSelector brands={brands} models={models} />
      </div>
    </div>
  )
}
