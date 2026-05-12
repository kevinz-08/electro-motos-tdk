'use client'

import { useState } from 'react'
import { generateInvoicePdf } from '@/lib/generateInvoicePdf'
import type { OrderHistoryEntry } from '@/lib/queries/getOrderHistory'

interface InvoiceDownloadButtonProps {
  order: OrderHistoryEntry
}

export function InvoiceDownloadButton({ order }: InvoiceDownloadButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    if (loading) return
    setLoading(true)
    try {
      await generateInvoicePdf(order)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500
        hover:text-gray-800 transition-colors disabled:opacity-50"
      title="Descargar factura PDF"
    >
      {loading ? (
        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
      )}
      {loading ? 'Generando...' : 'Factura PDF'}
    </button>
  )
}
