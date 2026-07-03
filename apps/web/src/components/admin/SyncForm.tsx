'use client'

import { useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Upload } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { SyncResultTable } from './SyncResultTable'
import type { SyncReport } from '@h2r/domain'

type StockSyncUpdate = { productId: string; stock: number; price?: number }

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'preview'; report: SyncReport }
  | { status: 'applying'; report: SyncReport }
  | { status: 'applied'; report: SyncReport; appliedCount: number }
  | { status: 'error'; message: string }

/** Convierte el detalle de cambios del preview al payload que espera /stock/apply. */
function toUpdates(report: SyncReport): StockSyncUpdate[] {
  return report.updatedItems.map((item) => ({
    productId: item.productId,
    stock: item.newStock,
    ...(item.newPrice !== null && { price: item.newPrice }),
  }))
}

export function SyncForm() {
  const { data: session } = useSession()
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<State>({ status: 'idle' })

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.xlsx')) {
      setState({ status: 'error', message: 'Solo se aceptan archivos .xlsx exportados desde Optimun.' })
      return
    }

    setState({ status: 'loading' })

    const form = new FormData()
    form.append('file', file)

    const res = await apiClient(session?.user?.accessToken).postForm<SyncReport>(
      '/admin/sync/stock/preview',
      form,
    )

    if (inputRef.current) inputRef.current.value = ''

    if (!res.ok) {
      setState({ status: 'error', message: res.error })
      return
    }

    setState({ status: 'preview', report: res.data })
  }

  const handleApply = async () => {
    if (state.status !== 'preview') return
    const updates = toUpdates(state.report)
    if (updates.length === 0) return

    setState({ status: 'applying', report: state.report })

    const res = await apiClient(session?.user?.accessToken).post<{ appliedCount: number }>(
      '/admin/sync/stock/apply',
      { updates },
    )

    if (!res.ok) {
      setState({ status: 'error', message: res.error })
      return
    }

    setState({ status: 'applied', report: state.report, appliedCount: res.data.appliedCount })
  }

  const isLoading = state.status === 'loading'
  const showDropZone = state.status === 'idle' || state.status === 'loading' || state.status === 'error'

  return (
    <div className="space-y-6">

      {/* ── Drop zone / selector ──────────────────────────────────────── */}
      {showDropZone && (
        <div
          className="border-2 border-dashed border-white/10 rounded-xl p-10 text-center hover:border-white/20 transition-colors cursor-pointer"
          onClick={() => !isLoading && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={handleFile}
            disabled={isLoading}
          />

          <Upload className="w-8 h-8 text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/50">
            {isLoading
              ? 'Leyendo archivo y calculando cambios...'
              : 'Selecciona el archivo .xlsx exportado desde Optimun'}
          </p>
          <p className="text-xs text-white/25 mt-1">Solo archivos .xlsx · Máx. 5 MB · No se guarda nada todavía</p>

          {!isLoading && (
            <button
              type="button"
              className="mt-4 inline-flex items-center gap-2 bg-white text-black text-sm font-semibold px-4 py-2 rounded-lg hover:bg-white/90 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Elegir archivo
            </button>
          )}

          {isLoading && (
            <div className="mt-4 flex justify-center">
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────────────────── */}
      {state.status === 'error' && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-sm text-red-400">{state.message}</p>
        </div>
      )}

      {/* ── Preview / aplicado ────────────────────────────────────────── */}
      {(state.status === 'preview' || state.status === 'applying' || state.status === 'applied') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-sm font-semibold text-white/70">
              {state.status === 'applied' ? 'Cambios guardados' : 'Vista previa — nada se ha guardado todavía'}
            </h2>
            <button
              type="button"
              className="text-xs text-white/30 hover:text-white/60 transition-colors"
              onClick={() => setState({ status: 'idle' })}
            >
              {state.status === 'applied' ? 'Sincronizar otro archivo' : 'Descartar'}
            </button>
          </div>

          <SyncResultTable report={state.report} />

          {state.status === 'applied' ? (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
              <p className="text-sm text-green-400">
                {state.appliedCount} {state.appliedCount === 1 ? 'producto actualizado' : 'productos actualizados'} en la tienda.
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleApply}
              disabled={state.status === 'applying' || state.report.updated === 0}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-black text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {state.status === 'applying'
                ? 'Guardando...'
                : state.report.updated === 0
                  ? 'No hay cambios para guardar'
                  : `Guardar cambios (${state.report.updated})`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
