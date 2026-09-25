/**
 * `/admin/revisores` — lista de revisores técnicos (docs/seo/, Fase 5 — H-21).
 * Lee directo de Prisma (patrón SSR admin, como `/admin/kits`).
 */
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { formatExperience } from '@h2r/domain'
import { prisma } from '@/infrastructure/database/prisma-client'

export default async function AdminReviewersPage() {
  const reviewers = await prisma.technicalReviewer.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { guides: true } } },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/25">Contenido</p>
          <h1 className="text-2xl font-bold tracking-tight text-white">Revisores técnicos</h1>
          <p className="mt-1 max-w-xl text-sm text-white/40">
            Quienes revisan y firman las guías de mantenimiento. Cada guía publicada muestra su foto, su trayectoria y una página propia.
          </p>
        </div>
        <Link
          href="/admin/revisores/nuevo"
          className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-white/90"
        >
          <Plus className="h-4 w-4" /> Nuevo revisor
        </Link>
      </div>

      {reviewers.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-6 py-16 text-center">
          <p className="text-sm text-white/40">Todavía no hay revisores. Registra el primero para poder publicar guías de mantenimiento.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Revisor', 'Experiencia', 'Guías', 'Estado', ''].map((h) => (
                  <th key={h} className={`px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/20 ${h === 'Guías' || h === 'Estado' ? 'text-center' : 'text-left'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reviewers.map((r) => (
                <tr key={r.id} className="border-b border-white/[0.04] transition-colors last:border-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5">
                    <Link href={`/admin/revisores/${r.id}`} className="flex items-center gap-3 hover:underline">
                      {r.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.photoUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <span className="h-9 w-9 rounded-full bg-white/10" />
                      )}
                      <span>
                        <span className="block font-medium text-white/80">{r.name}</span>
                        {r.headline && <span className="block text-xs text-white/35">{r.headline}</span>}
                      </span>
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-white/40">{formatExperience(r.yearsExperience) ?? '—'}</td>
                  <td className="px-5 py-3.5 text-center text-white/50">{r._count.guides}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${r.isActive ? 'bg-emerald-400' : 'bg-white/15'}`} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link href={`/admin/revisores/${r.id}`} className="text-xs font-medium text-white/40 transition-colors hover:text-white">
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
