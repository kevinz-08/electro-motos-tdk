'use client'

/**
 * Anticipo pre-envío de contraentrega (Settings.COD_DEPOSIT_AMOUNT).
 *
 * El admin escribe pesos; se guarda en centavos (convención de precios del proyecto).
 * 0 = desactivado. El anticipo se cobra por Wompi antes de despachar y se descuenta
 * del cobro en la puerta. El retiro en tienda siempre está exento.
 */
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { apiClient } from '@/lib/api-client'
import { CACHE_TAGS } from '@/lib/cache-tags'
import { revalidateAdminCache } from '@/lib/revalidate'

interface CodDepositFormProps {
  /** Valor inicial en centavos COP, leído desde la BD al cargar la página. */
  initialCents: number
}

export function CodDepositForm({ initialCents }: CodDepositFormProps) {
  const { data: session } = useSession()
  const [pesos, setPesos] = useState(String(Math.round(initialCents / 100)))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const save = async () => {
    const value = Number(pesos)
    if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
      setMessage({ ok: false, text: 'Ingresa un valor en pesos entero (0 para desactivar).' })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const res = await apiClient(session?.user?.accessToken).put<{ success: boolean }>(
        '/admin/settings/cod-deposit',
        { amountCents: Math.round(value * 100) },
      )
      // La política de envíos muestra este monto y se cachea con el tag `settings`.
      if (res.ok) await revalidateAdminCache([CACHE_TAGS.settings])
      setMessage(res.ok
        ? { ok: true, text: value === 0 ? 'Anticipo desactivado.' : 'Anticipo guardado.' }
        : { ok: false, text: 'No se pudo guardar. Intenta de nuevo.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <span className="text-white/50 text-sm">$</span>
        <input
          type="number"
          min={0}
          step={1000}
          value={pesos}
          onChange={(e) => setPesos(e.target.value)}
          aria-label="Anticipo de contraentrega en pesos"
          className="w-32 bg-[#111] text-white border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-white/30"
        />
      </div>
      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="px-3 py-1.5 text-sm font-semibold bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:opacity-50 transition-colors"
      >
        {saving ? 'Guardando...' : 'Guardar'}
      </button>
      {message && (
        <span className={`text-xs ${message.ok ? 'text-green-400' : 'text-red-400'}`}>{message.text}</span>
      )}
    </div>
  )
}
