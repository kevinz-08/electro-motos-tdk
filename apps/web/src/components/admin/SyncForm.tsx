'use client'

import { useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Upload } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { SyncResultTable } from './SyncResultTable'
import type { SyncReport } from '@h2r/domain'

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; report: SyncReport }
  | { status: 'error'; message: string }

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
      '/admin/sync/stock',
      form,
    )

    if (inputRef.current) inputRef.current.value = ''

    if (!res.ok) {
      setState({ status: 'error', message: res.error })
      return
    }

    setState({ status: 'success', report: res.data })
  }

  const isLoading = state.status === 'loading'

  return (
    <div className="space-y-6">

      {/* ── Drop zone / selector ──────────────────────────────────────── */}
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
            ? 'Procesando archivo...'
            : 'Selecciona el archivo .xlsx exportado desde Optimun'}
        </p>
        <p className="text-xs text-white/25 mt-1">Solo archivos .xlsx · Máx. 5 MB</p>

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

      {/* ── Error ─────────────────────────────────────────────────────── */}
      {state.status === 'error' && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-sm text-red-400">{state.message}</p>
        </div>
      )}

      {/* ── Resultado ─────────────────────────────────────────────────── */}
      {state.status === 'success' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white/70">Resultado de la sincronización</h2>
            <button
              type="button"
              className="text-xs text-white/30 hover:text-white/60 transition-colors"
              onClick={() => setState({ status: 'idle' })}
            >
              Limpiar
            </button>
          </div>
          <SyncResultTable report={state.report} />
        </div>
      )}
    </div>
  )
}
