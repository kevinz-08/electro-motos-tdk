'use client'

/**
 * Cortes del Índice de Precios en el panel (docs/seo/, Fase 5 — ítem 4).
 *
 * Flujo: "Generar corte de hoy" → revisar las cifras aquí mismo → "Publicar".
 * Solo lo publicado aparece en /indice-precios-repuestos-moto. Un corte
 * publicado no se regenera: primero se retira (vuelve a borrador).
 */
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import type { PriceIndexData } from '@h2r/domain'
import { apiClient } from '@/lib/api-client'
import { revalidateAdminCache } from '@/lib/revalidate'
import { CACHE_TAGS } from '@/lib/cache-tags'
import { formatCOP } from '@/components/store/PriceTag'

interface Snapshot {
  id: string
  cutoffDate: string
  methodologyVersion: number
  productCount: number
  data: PriceIndexData
  isPublished: boolean
  publishedAt: string | null
}

const day = (iso: string) => iso.slice(0, 10)

export function PriceIndexManager() {
  const { data: session } = useSession()
  const token = session?.user?.accessToken
  const [snapshots, setSnapshots] = useState<Snapshot[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!token) return
    const res = await apiClient(token).get<Snapshot[]>('/admin/price-index')
    if (!res.ok) return setError(res.error)
    setError(null)
    setSnapshots(res.data)
    setSelected((current) => current ?? res.data[0]?.id ?? null)
  }, [token])

  useEffect(() => {
    // Carga inicial desde la API; `load` solo actualiza estado al resolver.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const act = async (path: string, message: string) => {
    setBusy(true)
    const res = await apiClient(token).post<Snapshot>(path)
    setBusy(false)
    if (!res.ok) return toast.error(res.error)
    toast.success(message)
    await revalidateAdminCache([CACHE_TAGS.priceIndex, CACHE_TAGS.guides])
    setSelected(res.data.id)
    await load()
  }

  const current = snapshots?.find((s) => s.id === selected) ?? null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || !token}
          onClick={() => act('/admin/price-index/snapshot', 'Corte generado como borrador: revisa las cifras antes de publicar')}
          className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-black hover:bg-white/90 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Generar corte de hoy
        </button>
        <Link href="/indice-precios-repuestos-moto" target="_blank" className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white">
          Ver página pública <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {error && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200/80">
          No se pudieron cargar los cortes ({error}). Si la migración <code>20260926000000_phase5_content</code> no está aplicada
          (H-54), la tabla todavía no existe.
        </p>
      )}

      {snapshots && snapshots.length === 0 && <p className="text-sm text-white/40">Todavía no hay cortes.</p>}

      {snapshots && snapshots.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <ul className="space-y-1">
            {snapshots.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setSelected(s.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${s.id === selected ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5'}`}
                >
                  {day(s.cutoffDate)}
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${s.isPublished ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-white/50'}`}>
                    {s.isPublished ? 'Publicado' : 'Borrador'}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {current && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-white/60">
                  Corte del {day(current.cutoffDate)} · {current.productCount} referencias · metodología v{current.methodologyVersion} ·{' '}
                  {current.data.categories.length} categorías publicables
                </p>
                {current.isPublished ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => act(`/admin/price-index/${current.id}/unpublish`, 'Corte retirado de la página pública')}
                    className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white/70 hover:border-white/40 disabled:opacity-50"
                  >
                    Retirar publicación
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => act(`/admin/price-index/${current.id}/publish`, 'Corte publicado')}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    Revisé las cifras: publicar
                  </button>
                )}
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm tabular-nums">
                  <thead>
                    <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-white/30">
                      <th className="px-4 py-2 text-left">Categoría</th>
                      <th className="px-4 py-2 text-right">n</th>
                      <th className="px-4 py-2 text-right">Mediana</th>
                      <th className="px-4 py-2 text-right">P25 – P75</th>
                      <th className="px-4 py-2 text-right">Mín. – Máx.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {current.data.categories.map((c) => (
                      <tr key={c.slug} className="border-b border-white/[0.04] last:border-0 text-white/70">
                        <td className="px-4 py-2 text-white/90">{c.name}</td>
                        <td className="px-4 py-2 text-right">{c.count}</td>
                        <td className="px-4 py-2 text-right text-white">{formatCOP(c.median)}</td>
                        <td className="px-4 py-2 text-right">{formatCOP(c.p25)} – {formatCOP(c.p75)}</td>
                        <td className="px-4 py-2 text-right">{formatCOP(c.min)} – {formatCOP(c.max)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {current.data.insufficient.length > 0 && (
                <p className="text-xs text-white/40">
                  Sin muestra suficiente (menos de {current.data.minSample}):{' '}
                  {current.data.insufficient.map((i) => `${i.name} (${i.count})`).join(', ')}.
                </p>
              )}
              <p className="text-xs text-white/30">
                Revisa que ninguna cifra sea absurda (un precio mal cargado mueve el mínimo o el máximo). Si ves un error, corrige el
                producto y vuelve a generar el corte antes de publicar.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
