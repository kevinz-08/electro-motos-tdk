'use client'

/**
 * Reintento del pago del anticipo de un pedido contraentrega que sigue en AWAITING_DEPOSIT
 * (pago rechazado, widget cerrado, enlace del correo). Pide a la API una transacción Wompi nueva
 * y muestra el widget. Acceso: sesión del dueño o token firmado del enlace (invitados).
 */

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { apiClient } from '@/lib/api-client'
import { WompiWidget } from './WompiWidget'

interface WompiParams {
  publicKey: string
  amountInCents: number
  reference: string
  integritySignature: string
}

interface PayDepositSectionProps {
  orderId: string
  token?: string | null
}

export function PayDepositSection({ orderId, token }: PayDepositSectionProps) {
  const { data: session } = useSession()
  const [params, setParams] = useState<WompiParams | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const start = async () => {
    setLoading(true)
    setError(null)
    const query = token ? `?token=${encodeURIComponent(token)}` : ''
    const res = await apiClient(session?.user?.accessToken).post<{ payment: WompiParams }>(
      `/orders/${orderId}/deposit-transaction${query}`,
    )
    setLoading(false)
    if (!res.ok) {
      setError(res.error || 'No pudimos iniciar el pago del anticipo. Intenta de nuevo.')
      return
    }
    setParams(res.data.payment)
  }

  const redirectUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/checkout/confirmacion?orderId=${orderId}&token=${encodeURIComponent(token ?? '')}`

  return (
    <div className="mt-6 bg-white border border-orange-200 rounded-2xl p-6">
      <h2 className="font-bold text-gray-900 mb-1">Paga tu anticipo para confirmar el envío</h2>
      <p className="text-sm text-gray-500 mb-4">
        Tu pedido contraentrega se despacha cuando recibimos el anticipo. Ese valor se descuenta de lo que pagas al recibir.
      </p>
      {params ? (
        <WompiWidget {...params} redirectUrl={redirectUrl} />
      ) : (
        <button
          type="button"
          onClick={() => void start()}
          disabled={loading}
          className="w-full bg-sky-500 text-white py-3 rounded-xl font-bold hover:bg-sky-600 disabled:opacity-60 transition-colors"
        >
          {loading ? 'Preparando pago...' : 'Pagar anticipo'}
        </button>
      )}
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </div>
  )
}
