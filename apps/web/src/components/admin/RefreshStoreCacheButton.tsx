'use client'

/**
 * "Refrescar tienda": invalida todos los tags de la caché pública.
 *
 * La tienda se cachea sin TTL (README §27) y cada formulario del admin invalida
 * solo lo que toca. Este botón es para los cambios hechos FUERA del panel
 * (scripts como `pnpm db:catalog`, Prisma Studio, llamadas directas al API), que
 * de otro modo no se verían nunca. Las páginas se regeneran en la siguiente
 * visita, así que usarlo de más solo cuesta unas cuantas queries.
 */
import { useState } from 'react'
import { CACHE_TAGS } from '@/lib/cache-tags'

export function RefreshStoreCacheButton() {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'ok' | 'error'; message: string } | null>(null)

  const refresh = async () => {
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch('/api/admin/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: Object.values(CACHE_TAGS) }),
      })
      setStatus(
        res.ok
          ? { type: 'ok', message: 'Listo: la tienda mostrará los datos actuales en la próxima visita.' }
          : { type: 'error', message: `No se pudo refrescar (error ${res.status}).` },
      )
    } catch {
      setStatus({ type: 'error', message: 'No se pudo refrescar: revisa tu conexión.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={refresh}
        disabled={loading}
        className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-500 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Refrescando...' : 'Refrescar tienda'}
      </button>
      {status && (
        <p className={`text-sm ${status.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{status.message}</p>
      )}
    </div>
  )
}
