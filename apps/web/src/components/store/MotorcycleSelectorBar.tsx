/**
 * Barra del selector "¿Qué moto tienes?" bajo el navbar (docs/seo/, Fase 2).
 *
 * Server Component: carga el catálogo de motos (cacheado 1 h con el tag
 * `fitments`) y se lo pasa al selector, que es cliente. Así el desplegable se
 * abre instantáneamente, sin fetch, y la barra no obliga a ninguna página a
 * volverse dinámica — no lee cookies en el servidor.
 *
 * Si todavía no hay marcas o modelos cargados, no se renderiza nada: una barra
 * con un selector vacío es peor que no tener barra.
 */
import { getCachedMotorcycleCatalog } from '@/lib/cache'
import { MotorcycleSelector } from './MotorcycleSelector'

export async function MotorcycleSelectorBar() {
  const { brands, models } = await getCachedMotorcycleCatalog()

  if (brands.length === 0 || models.length === 0) return null

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
