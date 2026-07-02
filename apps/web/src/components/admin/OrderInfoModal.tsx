'use client'

/**
 * Modal de información detallada del pedido para el panel admin.
 *
 * Patrón:
 *   - Renderiza siempre un botón (info icon) que abre el modal.
 *   - Al abrir, dispara fetch a /api/admin/orders/[id] (lazy: solo cuando lo abren).
 *   - Cierra con click fuera, tecla Esc o el botón ✕.
 *
 * No carga datos hasta que el admin clickea — evita N+1 queries por cada
 * fila de la tabla si nunca abre los modales.
 */

import { useEffect, useState, useCallback } from 'react'

interface OrderDetails {
  id: string
  createdAt: string
  status: string
  total: number
  shippingTotal: number
  paymentProvider: string
  vendeloOrderId: string | null
  policiesAcceptedAt: string | null
  buyer: { idType: string; idNumber: string; businessName: string | null }
  shippingAddress: {
    fullName: string
    address: string
    city: string
    department?: string
    phone: string
    notes?: string
  }
  user: { email: string; name: string | null }
  items: Array<{ sku: string; name: string; quantity: number; unitPrice: number; subtotal: number }>
  payment: {
    provider: string
    status: string
    externalId: string | null
    amount: number
    createdAt: string
  } | null
  shipment: {
    status: string
    trackingNumber: string | null
    carrier: string | null
    updatedAt: string
  } | null
}

function formatCOP(cents: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(cents / 100)
}

function formatDateTime(d: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(d))
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-amber-500/20 text-amber-400',
  PAID: 'bg-green-500/20 text-green-400',
  SHIPPED: 'bg-blue-500/20 text-blue-400',
  DELIVERED: 'bg-purple-500/20 text-purple-400',
  CANCELLED: 'bg-red-500/20 text-red-400',
  APPROVED: 'bg-green-500/20 text-green-400',
  DECLINED: 'bg-red-500/20 text-red-400',
  PREPARING: 'bg-indigo-500/20 text-indigo-400',
  READY: 'bg-cyan-500/20 text-cyan-400',
  INCIDENT: 'bg-orange-500/20 text-orange-400',
  RETURNED: 'bg-red-500/20 text-red-400',
}

export function OrderInfoModal({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Carga lazy: solo cuando se abre por primera vez. Se cachea para reaperturas.
  const load = useCallback(async () => {
    if (data) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [orderId, data])

  function handleOpen() {
    setOpen(true)
    void load()
  }

  // ESC para cerrar
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        title="Ver información del pedido"
        className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Pedido #{orderId.slice(-8).toUpperCase()}
                </h2>
                {data && (
                  <p className="text-xs text-white/40 mt-0.5">
                    Creado el {formatDateTime(data.createdAt)}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-white/40 hover:text-white transition-colors text-2xl leading-none"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto px-6 py-5 space-y-6">
              {loading && (
                <div className="text-center py-10 text-white/40">Cargando...</div>
              )}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
                  Error: {error}
                </div>
              )}
              {data && (
                <>
                  {/* Estado del pedido */}
                  <Section title="Estado">
                    <div className="flex flex-wrap gap-2">
                      <Pill label={`Pedido: ${data.status}`} color={STATUS_COLOR[data.status]} />
                      {data.payment && (
                        <Pill label={`Pago: ${data.payment.status}`} color={STATUS_COLOR[data.payment.status]} />
                      )}
                      {data.shipment && (
                        <Pill label={`Envío: ${data.shipment.status}`} color={STATUS_COLOR[data.shipment.status]} />
                      )}
                      {data.shippingTotal > 0 && (
                        <Pill label="Envío pagado en línea" color="bg-sky-500/20 text-sky-400" />
                      )}
                    </div>
                  </Section>

                  {/* Comprador */}
                  <Section title="Comprador">
                    <KV label="Nombre" value={data.buyer.businessName ?? data.shippingAddress.fullName} />
                    {data.buyer.businessName && <KV label="Contacto" value={data.shippingAddress.fullName} />}
                    <KV label={data.buyer.idType} value={data.buyer.idNumber || '(no proporcionado)'} />
                    <KV label="Email" value={data.user.email} mono />
                    <KV label="Teléfono" value={data.shippingAddress.phone} />
                  </Section>

                  {/* Envío */}
                  <Section title="Envío">
                    <KV label="Dirección" value={data.shippingAddress.address} />
                    <KV label="Ciudad" value={data.shippingAddress.city} />
                    {data.shippingAddress.department && (
                      <KV label="Departamento" value={data.shippingAddress.department} />
                    )}
                    {data.shippingAddress.notes && (
                      <KV label="Notas" value={data.shippingAddress.notes} />
                    )}
                    {data.shipment?.trackingNumber && (
                      <KV label="Tracking" value={data.shipment.trackingNumber} mono />
                    )}
                    {data.shipment?.carrier && (
                      <KV label="Transportador" value={data.shipment.carrier} />
                    )}
                    {data.vendeloOrderId && (
                      <KV label="ID Vendelo" value={data.vendeloOrderId} mono />
                    )}
                  </Section>

                  {/* Items */}
                  <Section title="Productos">
                    <div className="rounded-lg border border-white/10 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-white/5 text-white/40 text-xs uppercase tracking-wide">
                          <tr>
                            <th className="text-left px-3 py-2 font-semibold">SKU</th>
                            <th className="text-left px-3 py-2 font-semibold">Producto</th>
                            <th className="text-center px-3 py-2 font-semibold">Cant</th>
                            <th className="text-right px-3 py-2 font-semibold">Unitario</th>
                            <th className="text-right px-3 py-2 font-semibold">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-white">
                          {data.items.map((it, i) => (
                            <tr key={i}>
                              <td className="px-3 py-2 font-mono text-xs text-white/60">{it.sku}</td>
                              <td className="px-3 py-2">{it.name}</td>
                              <td className="px-3 py-2 text-center">{it.quantity}</td>
                              <td className="px-3 py-2 text-right">{formatCOP(it.unitPrice)}</td>
                              <td className="px-3 py-2 text-right font-medium">{formatCOP(it.subtotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-white/5">
                          {data.shippingTotal > 0 && (
                            <>
                              <tr>
                                <td colSpan={4} className="px-3 py-1.5 text-right text-white/50">Subtotal productos</td>
                                <td className="px-3 py-1.5 text-right text-white/70">{formatCOP(data.total - data.shippingTotal)}</td>
                              </tr>
                              <tr>
                                <td colSpan={4} className="px-3 py-1.5 text-right text-white/50">Envío</td>
                                <td className="px-3 py-1.5 text-right text-white/70">{formatCOP(data.shippingTotal)}</td>
                              </tr>
                            </>
                          )}
                          <tr>
                            <td colSpan={4} className="px-3 py-2 text-right font-semibold text-white/60">Total</td>
                            <td className="px-3 py-2 text-right font-bold text-white text-base">{formatCOP(data.total)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </Section>

                  {/* Pago */}
                  {data.payment && (
                    <Section title="Pago">
                      <KV label="Pasarela" value={data.payment.provider} />
                      {data.payment.externalId && (
                        <KV label="ID transacción" value={data.payment.externalId} mono />
                      )}
                      <KV label="Procesado" value={formatDateTime(data.payment.createdAt)} />
                    </Section>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center gap-3 px-6 py-4 border-t border-white/10 shrink-0">
              <a
                href={`/api/orders/${orderId}/comprobante`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-sky-400 hover:text-sky-300 transition-colors inline-flex items-center gap-1"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Descargar comprobante PDF
              </a>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Subcomponentes pequeños ──────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold text-white/40 uppercase tracking-wide mb-2">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function KV({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-white/40 w-28 shrink-0">{label}</span>
      <span className={`text-white ${mono ? 'font-mono text-xs' : ''} break-all`}>{value}</span>
    </div>
  )
}

function Pill({ label, color }: { label: string; color?: string }) {
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${color ?? 'bg-white/10 text-white/60'}`}>
      {label}
    </span>
  )
}
