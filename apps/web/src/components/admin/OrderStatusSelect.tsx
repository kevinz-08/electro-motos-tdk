'use client'

import { useState } from 'react'
import { OrderStatus } from '@h2r/domain'

/** Estados válidos según el método de pago: contraentrega (COD) usa los suyos. */
const ONLINE_STATUSES: OrderStatus[] = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED']
const COD_STATUSES: OrderStatus[] = ['AWAITING_DEPOSIT', 'COD_CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']

const statusLabels: Record<OrderStatus, string> = {
  PENDING:   'Pendiente',
  PAID:      'Pagado',
  AWAITING_DEPOSIT: 'Esperando anticipo',
  COD_CONFIRMED:    'Confirmado COD',
  SHIPPED:   'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
}

interface OrderStatusSelectProps {
  orderId: string
  currentStatus: OrderStatus
  paymentProvider: string
}

export function OrderStatusSelect({ orderId, currentStatus, paymentProvider }: OrderStatusSelectProps) {
  const [status, setStatus] = useState<OrderStatus>(currentStatus)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const statusOptions = paymentProvider === 'COD' ? COD_STATUSES : ONLINE_STATUSES

  const handleChange = async (newStatus: OrderStatus) => {
    if (newStatus === status || loading) return
    setLoading(true)
    setError(false)

    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        setStatus(newStatus)
      } else {
        setError(true)
        setTimeout(() => setError(false), 3000)
      }
    } catch {
      setError(true)
      setTimeout(() => setError(false), 3000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <select
      value={status}
      onChange={(e) => handleChange(e.target.value as OrderStatus)}
      disabled={loading}
      title={error ? 'Error al actualizar el estado' : undefined}
      className={`text-xs bg-[#111] text-white border rounded-lg px-2 py-1.5 focus:outline-none focus:border-white/30 disabled:opacity-50 cursor-pointer transition-colors ${
        error ? 'border-red-500/60' : 'border-white/10'
      }`}
    >
      {statusOptions.map((s) => (
        <option key={s} value={s} className="bg-[#111] text-white">
          {loading && s === status ? '...' : statusLabels[s]}
        </option>
      ))}
    </select>
  )
}
