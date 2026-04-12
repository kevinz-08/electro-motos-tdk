'use client'

import { useState } from 'react'
import { OrderStatus } from '@/domain/entities/Order'

const statusOptions: OrderStatus[] = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED']

const statusLabels: Record<OrderStatus, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
}

interface OrderStatusSelectProps {
  orderId: string
  currentStatus: OrderStatus
}

export function OrderStatusSelect({ orderId, currentStatus }: OrderStatusSelectProps) {
  const [status, setStatus] = useState<OrderStatus>(currentStatus)
  const [loading, setLoading] = useState(false)

  const handleChange = async (newStatus: OrderStatus) => {
    if (newStatus === status) return
    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) setStatus(newStatus)
    } finally {
      setLoading(false)
    }
  }

  return (
    <select
      value={status}
      onChange={(e) => handleChange(e.target.value as OrderStatus)}
      disabled={loading}
      className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-amber-400 disabled:opacity-50"
    >
      {statusOptions.map((s) => (
        <option key={s} value={s}>
          {statusLabels[s]}
        </option>
      ))}
    </select>
  )
}
