/**
 * `/admin/mantenimiento` — todos los modelos con el estado de su guía de
 * mantenimiento (docs/seo/, Fase 5 — H-20).
 *
 *   Sin guía   → la ruta pública responde 404 y el hub no enseña enlace.
 *   Publicada  → guardada, con al menos un punto de control y revisor activo.
 *   Oculta     → guardada, pero su revisor está desactivado: no se publica.
 */
import Link from 'next/link'
import { isMaintenanceGuidePublishable } from '@h2r/domain'
import { prisma } from '@/infrastructure/database/prisma-client'

const STATUS = {
  NONE: { label: 'Sin guía', dot: 'bg-white/15', text: 'text-white/35' },
  PUBLISHED: { label: 'Publicada', dot: 'bg-emerald-400', text: 'text-emerald-300/80' },
  HIDDEN: { label: 'Oculta (revisor desactivado)', dot: 'bg-amber-400', text: 'text-amber-300/80' },
} as const

export default async function AdminMaintenancePage() {
  const models = await prisma.motorcycleModel.findMany({
    where: { isActive: true },
    orderBy: [{ brand: { order: 'asc' } }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      brand: { select: { name: true } },
      maintenanceGuide: {
        select: { reviewedAt: true, reviewer: { select: { name: true, isActive: true } }, _count: { select: { items: true } } },
      },
    },
  })

  const rows = models.map((m) => {
    const guide = m.maintenanceGuide
    const publishable = guide ? isMaintenanceGuidePublishable({ items: new Array(guide._count.items) }, guide.reviewer) : false
    return { ...m, status: (!guide ? 'NONE' : publishable ? 'PUBLISHED' : 'HIDDEN') as keyof typeof STATUS }
  })
  const published = rows.filter((r) => r.status === 'PUBLISHED').length

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/25">Contenido</p>
        <h1 className="text-2xl font-bold tracking-tight text-white">Mantenimiento por modelo</h1>
        <p className="mt-1 max-w-xl text-sm text-white/40">
          Intervalos de mantenimiento preventivo de cada moto. Al guardar los de un modelo, su guía se publica sola; sin datos guardados no se muestra nada.
          {' '}<span className="text-white/60">{published} de {rows.length} modelos con guía publicada.</span>
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Modelo', 'Estado', 'Puntos', 'Revisor', 'Revisada', ''].map((h) => (
                <th key={h} className={`px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/20 ${h === 'Puntos' ? 'text-center' : 'text-left'}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => {
              const s = STATUS[m.status]
              return (
                <tr key={m.id} className="border-b border-white/[0.04] transition-colors last:border-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5 font-medium text-white/80">
                    <Link href={`/admin/mantenimiento/${m.id}`} className="hover:underline">{m.brand.name} {m.name}</Link>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-2 text-xs ${s.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} /> {s.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center text-white/50">{m.maintenanceGuide?._count.items ?? '—'}</td>
                  <td className="px-5 py-3.5 text-xs text-white/40">{m.maintenanceGuide?.reviewer.name ?? '—'}</td>
                  <td className="px-5 py-3.5 text-xs text-white/40">
                    {m.maintenanceGuide ? m.maintenanceGuide.reviewedAt.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link href={`/admin/mantenimiento/${m.id}`} className="text-xs font-medium text-white/40 transition-colors hover:text-white">
                      {m.status === 'NONE' ? 'Crear guía' : 'Editar'}
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
