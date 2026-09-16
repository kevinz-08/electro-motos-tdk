'use client'

/**
 * Moderación de reseñas verificadas (README §22.6). Aprobar publica la reseña en la PDP
 * (invalida el tag `products`); rechazar la oculta sin borrarla.
 */
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { apiClient } from '@/lib/api-client'
import { revalidateAdminCache } from '@/lib/revalidate'
import { CACHE_TAGS } from '@/lib/cache-tags'

export type ReviewRow = {
  id: string
  rating: number
  recommends: boolean
  comment: string | null
  authorName: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  productName: string
  productSlug: string
}

const TABS: Array<{ status: ReviewRow['status']; label: string }> = [
  { status: 'PENDING', label: 'Pendientes' },
  { status: 'APPROVED', label: 'Aprobadas' },
  { status: 'REJECTED', label: 'Rechazadas' },
]

export function ReviewModeration({
  reviews, activeStatus, counts,
}: { reviews: ReviewRow[]; activeStatus: ReviewRow['status']; counts: Record<string, number> }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function moderate(id: string, status: ReviewRow['status']) {
    setBusyId(id)
    setErrors((prev) => ({ ...prev, [id]: '' }))
    const res = await apiClient(session?.user?.accessToken).patch(`/admin/reviews/${id}`, { status })
    if (!res.ok) {
      setErrors((prev) => ({ ...prev, [id]: res.error ?? 'Error al actualizar' }))
      setBusyId(null)
      return
    }
    await revalidateAdminCache([CACHE_TAGS.products])
    setBusyId(null)
    router.refresh()
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Reseñas</h1>
        <p className="text-white/40 text-sm mt-1">
          Solo compradores con pedido entregado pueden reseñar. Nada se publica hasta que lo apruebes.
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        {TABS.map((tab) => (
          <Link
            key={tab.status}
            href={`/admin/resenas?status=${tab.status}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeStatus === tab.status ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50 hover:text-white'
            }`}
          >
            {tab.label} ({counts[tab.status] ?? 0})
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        {reviews.length === 0 && (
          <p className="text-center text-white/30 py-12 bg-white/5 border border-white/10 rounded-xl">No hay reseñas en esta sección.</p>
        )}
        {reviews.map((r) => (
          <div key={r.id} className="bg-white/5 border border-white/10 rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/producto/${r.productSlug}`} target="_blank" className="text-sm font-semibold text-blue-400 hover:text-blue-300">
                  {r.productName}
                </Link>
                <p className="text-amber-400 text-sm mt-1" aria-label={`${r.rating} de 5`}>
                  {'★'.repeat(r.rating)}<span className="text-white/20">{'★'.repeat(5 - r.rating)}</span>
                  <span className="text-white/40 ml-2">{r.recommends ? 'Lo recomienda' : 'No lo recomienda'}</span>
                </p>
                {r.comment
                  ? <p className="text-sm text-white/80 mt-2 whitespace-pre-line break-words">{r.comment}</p>
                  : <p className="text-sm text-white/30 mt-2 italic">Sin comentario</p>}
                <p className="text-xs text-white/30 mt-2">
                  {r.authorName} · {new Date(r.createdAt).toLocaleString('es-CO')}
                </p>
                {errors[r.id] && <p className="text-xs text-red-400 mt-1">{errors[r.id]}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                {r.status !== 'APPROVED' && (
                  <button
                    onClick={() => moderate(r.id, 'APPROVED')}
                    disabled={busyId === r.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-50"
                  >
                    Aprobar
                  </button>
                )}
                {r.status !== 'REJECTED' && (
                  <button
                    onClick={() => moderate(r.id, 'REJECTED')}
                    disabled={busyId === r.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/15 text-red-400 hover:bg-red-500/25 disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
