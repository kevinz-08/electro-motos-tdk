'use client'

/**
 * Umbrales de prueba social y estimación de entrega de la PDP (README §22.3).
 * Estado inicial por SSR; PUT /admin/settings/cro y revalidación del tag `settings`.
 */
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import type { CroSettings } from '@h2r/domain'
import { apiClient } from '@/lib/api-client'
import { revalidateAdminCache } from '@/lib/revalidate'
import { CACHE_TAGS } from '@/lib/cache-tags'

/** Campos que se guardan en centavos pero el admin edita en pesos COP. */
const PESO_FIELDS: ReadonlyArray<keyof CroSettings> = ['freeShippingThreshold']

const toInput = (name: keyof CroSettings, stored: number) =>
  String(PESO_FIELDS.includes(name) ? stored / 100 : stored)
const toStored = (name: keyof CroSettings, input: string) => {
  const n = parseInt(input, 10)
  return PESO_FIELDS.includes(name) ? n * 100 : n
}

const FIELDS: Array<{ name: keyof CroSettings; label: string; help: string; min: number; max: number }> = [
  { name: 'socialProofMinSold', label: 'Mínimo de ventas para "🔥 X personas han comprado"', help: 'Por debajo de este número el contador no se muestra.', min: 0, max: 100000 },
  { name: 'reviewsMinCount', label: 'Mínimo de reseñas para mostrar estrellas', help: 'Evita mostrar un promedio con muy pocas opiniones.', min: 1, max: 1000 },
  { name: 'lowStockThreshold', label: 'Urgencia de stock ("¡Solo quedan X!")', help: 'Se muestra cuando el stock es mayor que 0 y menor que este valor.', min: 0, max: 1000 },
  { name: 'shippingEtaMinDays', label: 'Entrega: días hábiles mínimos', help: 'Desde el despacho hasta la entrega.', min: 0, max: 60 },
  { name: 'shippingEtaMaxDays', label: 'Entrega: días hábiles máximos', help: 'Debe ser mayor o igual al mínimo.', min: 0, max: 60 },
  { name: 'shippingCutoffHour', label: 'Hora de corte para despachar el mismo día', help: 'Hora de Colombia (0-24). Después de esta hora se cuenta desde el siguiente día hábil.', min: 0, max: 24 },
  { name: 'freeShippingThreshold', label: 'Envío gratis desde (COP)', help: 'Compra mínima en pesos. Alimenta la ficha, el carrito y la barra de progreso. 0 = no se promete envío gratis.', min: 0, max: 1000000000 },
]

export function CroSettingsForm({ initial }: { initial: CroSettings }) {
  const { data: session } = useSession()
  const [values, setValues] = useState<Record<keyof CroSettings, string>>(
    Object.fromEntries(FIELDS.map((f) => [f.name, toInput(f.name, initial[f.name])])) as Record<keyof CroSettings, string>,
  )
  const [status, setStatus] = useState<{ type: 'ok' | 'error'; message: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus(null)
    const payload = Object.fromEntries(FIELDS.map((f) => [f.name, toStored(f.name, values[f.name])]))
    if (Object.values(payload).some((v) => Number.isNaN(v))) {
      setStatus({ type: 'error', message: 'Todos los campos deben ser números enteros' })
      return
    }
    setLoading(true)
    try {
      const res = await apiClient(session?.user?.accessToken).put<void>('/admin/settings/cro', payload)
      if (!res.ok) {
        setStatus({ type: 'error', message: res.error ?? 'Error al guardar' })
        return
      }
      await revalidateAdminCache([CACHE_TAGS.settings])
      setStatus({ type: 'ok', message: 'Configuración guardada' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FIELDS.map((f) => (
          <div key={f.name}>
            <label htmlFor={`cro-${f.name}`} className="block text-sm font-medium text-white/70 mb-1">{f.label}</label>
            <input
              id={`cro-${f.name}`}
              type="number"
              min={f.min}
              max={f.max}
              step={1}
              required
              value={values[f.name]}
              onChange={(e) => setValues((prev) => ({ ...prev, [f.name]: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
            <p className="text-xs text-white/30 mt-1">{f.help}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-500 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
        {status && (
          <p className={`text-sm ${status.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{status.message}</p>
        )}
      </div>
    </form>
  )
}
