/**
 * Grilla de kits visibles (docs/seo/plan-kits.md). Server Component: los datos
 * ya llegan filtrados por `findKitsByModel`/`findAllVisibleKits` (activos, no
 * borrados, con disponibilidad). Sin kits, no se pinta nada.
 */
import { KitCard } from '@/components/store/KitCard'
import type { KitSummary } from '@/lib/kits'

export function KitsSection({ kits, heading, className = '' }: { kits: KitSummary[]; heading: string; className?: string }) {
  if (kits.length === 0) return null

  return (
    <section className={className}>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{heading}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {kits.map((kit) => (
          <KitCard key={kit.id} kit={kit} />
        ))}
      </div>
    </section>
  )
}
