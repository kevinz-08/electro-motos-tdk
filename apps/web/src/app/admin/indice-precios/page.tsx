/**
 * `/admin/indice-precios` — cortes del Índice de Precios de Repuestos de Moto
 * (docs/seo/, Fase 5 — ítem 4): generar, revisar y publicar.
 */
import { PriceIndexManager } from '@/components/admin/PriceIndexManager'

export default function AdminPriceIndexPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/25">Contenido</p>
        <h1 className="text-2xl font-bold tracking-tight text-white">Índice de Precios</h1>
        <p className="mt-1 max-w-2xl text-sm text-white/40">
          Una foto de los precios del catálogo por categoría, para prensa y citas. Se recomienda un corte por semestre. Nada se
          publica sin que alguien revise las cifras.
        </p>
      </div>
      <PriceIndexManager />
    </div>
  )
}
