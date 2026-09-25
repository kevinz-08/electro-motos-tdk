/**
 * `/kits` — índice de kits (docs/seo/plan-kits.md, Fase 4 ítem 8).
 *
 * Solo lista kits visibles (activos, con disponibilidad). Sin ninguno,
 * muestra un estado vacío en vez de una página rota — pero sigue siendo
 * indexable: puede haber kits mañana.
 */
import type { Metadata } from 'next'
import { Breadcrumbs } from '@/components/store/Breadcrumbs'
import { KitsSection } from '@/components/store/KitsSection'
import { JsonLd } from '@/components/seo/JsonLd'
import { kitItemListJsonLd } from '@/lib/structured-data'
import { canonical } from '@/lib/seo'
import { getCachedAllVisibleKits } from '@/lib/cache'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Kits de mantenimiento para moto',
  description: 'Kits de repuestos armados para el mantenimiento de tu moto, con precio total y envío a toda Colombia.',
  alternates: canonical('/kits'),
  robots: { index: true, follow: true },
}

export default async function KitsIndexPage() {
  // Complemento opcional: si la lectura falla (p. ej. migración sin aplicar),
  // la página se sirve con la lista vacía en vez de caerse.
  let kits: Awaited<ReturnType<typeof getCachedAllVisibleKits>> = []
  try {
    kits = await getCachedAllVisibleKits()
  } catch (e) {
    console.error('[kits] no se pudo leer el índice de kits', e)
  }

  return (
    <div className="bg-white min-h-screen">
      {kits.length > 0 && <JsonLd data={kitItemListJsonLd(kits)} />}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Kits' }]} />

        <header className="mt-6 mb-10">
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">Kits de mantenimiento</h1>
          <p className="mt-3 max-w-2xl text-gray-600 leading-relaxed">
            Repuestos armados en conjunto para el mantenimiento de tu moto, con el precio total a la vista.
          </p>
        </header>

        {kits.length === 0 ? (
          <p className="text-gray-500">Todavía no hay kits publicados. Vuelve pronto.</p>
        ) : (
          <KitsSection kits={kits} heading="Todos los kits" />
        )}
      </div>
    </div>
  )
}
