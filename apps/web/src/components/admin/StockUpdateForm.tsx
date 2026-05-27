'use client'

import { useState } from 'react'

interface StockUpdateFormProps {
  productId: string
  currentStock: number
}

export function StockUpdateForm({ productId, currentStock }: StockUpdateFormProps) {
  const [value, setValue] = useState(currentStock)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    setSaved(false)
    try {
      await fetch(`/api/admin/products/${productId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: value }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-20 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:border-white/30 transition-colors"
      />
      <button
        onClick={handleSave}
        disabled={loading || value === currentStock}
        className="text-xs bg-amber-400 text-gray-900 px-3 py-1.5 rounded-lg font-medium hover:bg-amber-300 transition-colors disabled:opacity-50"
      >
        {loading ? '...' : saved ? '✓' : 'Guardar'}
      </button>
    </div>
  )
}
