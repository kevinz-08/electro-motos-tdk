/**
 * `/admin/compatibilidades` — catálogo de motos, importador de CSV y resumen de
 * compatibilidades por modelo (docs/seo/, H-37). Todo el contenido es cliente
 * porque se refresca tras cada importación o alta de modelo.
 */
import { CompatibilityManager } from '@/components/admin/CompatibilityManager'

export default function AdminCompatibilityPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/25">Catálogo</p>
        <h1 className="text-2xl font-bold tracking-tight text-white">Compatibilidades</h1>
        <p className="mt-1 max-w-2xl text-sm text-white/40">
          Qué repuesto le sirve a qué moto. Solo se publican las compatibilidades verificadas, y un modelo sin ninguna
          no tiene página propia. Una compatibilidad equivocada genera una devolución: ante la duda, sin verificar.
        </p>
      </div>
      <CompatibilityManager />
    </div>
  )
}
