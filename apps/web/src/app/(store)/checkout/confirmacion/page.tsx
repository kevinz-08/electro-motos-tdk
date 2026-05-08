import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { getOrderConfirmation } from '@/lib/queries/getOrderConfirmation'
import { OrderStatusBadge } from '@/components/store/OrderStatusBadge'

interface PageProps {
  searchParams: Promise<{ orderId?: string }>
}

export const metadata: Metadata = {
  title: 'Confirmación del pedido',
  description: 'Revisa el estado de tu pedido y los siguientes pasos tras el pago.',
  robots: { index: false, follow: false },
}

function formatCOP(cents: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

const PAYMENT_PROVIDER_LABEL: Record<string, string> = {
  WOMPI: 'Wompi',
  MERCADO_PAGO: 'Mercado Pago',
}

// ─── Estado desconocido (sin orderId o pedido no encontrado) ──────────────────

function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Pedido no encontrado</h1>
        <p className="text-gray-500 mb-6">
          No pudimos encontrar los detalles de tu pedido. Revisa tu historial.
        </p>
        <Link
          href="/pedidos"
          className="inline-block bg-sky-400 text-black px-6 py-3 rounded-xl font-bold hover:bg-sky-500 hover:text-white transition-colors"
        >
          Ver mis pedidos
        </Link>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default async function ConfirmacionPage({ searchParams }: PageProps) {
  const { orderId } = await searchParams

  if (!orderId) return <NotFound />

  const order = await getOrderConfirmation(orderId)
  if (!order) return <NotFound />

  const isPaid = order.status === 'PAID'
  const isPending = order.status === 'PENDING'

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">

        {/* ── Hero de estado ─────────────────────────────────────────────── */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">{isPaid ? '✅' : isPending ? '⏳' : '📦'}</div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">
            {isPaid ? '¡Pago confirmado!' : isPending ? 'Pago en procesamiento' : 'Pedido actualizado'}
          </h1>
          <p className="text-gray-500 max-w-sm mx-auto">
            {isPaid
              ? 'Tu pedido fue aprobado. Recibirás un email con los detalles.'
              : isPending
                ? 'Tu pago está siendo procesado. Te notificaremos cuando se confirme.'
                : 'Revisa el estado de tu pedido a continuación.'}
          </p>
        </div>

        {/* ── Tarjeta principal ──────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">

          {/* Cabecera de la tarjeta */}
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-1">
                Número de pedido
              </p>
              <p className="font-mono text-lg font-black text-gray-900">
                #{order.id.slice(-8).toUpperCase()}
              </p>
            </div>
            <div className="flex flex-col sm:items-end gap-1">
              <OrderStatusBadge status={order.status} />
              <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
            </div>
          </div>

          {/* Productos */}
          <div className="px-6 py-5">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-4">
              Productos
            </p>
            <ul className="space-y-4">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-4">
                  {/* Thumbnail */}
                  {item.productImage ? (
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                      <Image
                        src={item.productImage}
                        alt={item.productName}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 text-2xl">
                      🛒
                    </div>
                  )}

                  {/* Descripción */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/producto/${item.productSlug}`}
                      className="text-sm font-semibold text-gray-900 hover:text-sky-600 transition-colors line-clamp-2"
                    >
                      {item.productName}
                    </Link>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {item.quantity} {item.quantity === 1 ? 'unidad' : 'unidades'} × {formatCOP(item.priceAtPurchase)}
                    </p>
                  </div>

                  {/* Subtotal */}
                  <p className="text-sm font-bold text-gray-800 shrink-0">
                    {formatCOP(item.quantity * item.priceAtPurchase)}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* Total */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-600">Total pagado</span>
            <span className="text-xl font-black text-gray-900">{formatCOP(order.total)}</span>
          </div>

          {/* Dirección + método de pago */}
          <div className="px-6 py-5 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Envío */}
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-2">
                Dirección de envío
              </p>
              <address className="not-italic text-sm text-gray-700 space-y-0.5">
                <p className="font-semibold">{order.shippingAddress.fullName}</p>
                <p>{order.shippingAddress.address}</p>
                <p>{order.shippingAddress.city}, {order.shippingAddress.department}</p>
                <p className="text-gray-500">{order.shippingAddress.phone}</p>
                {order.shippingAddress.notes && (
                  <p className="text-gray-400 text-xs mt-1 italic">{order.shippingAddress.notes}</p>
                )}
              </address>
            </div>

            {/* Pago */}
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-2">
                Método de pago
              </p>
              <p className="text-sm font-semibold text-gray-700">
                {PAYMENT_PROVIDER_LABEL[order.paymentProvider] ?? order.paymentProvider}
              </p>
              {isPending && (
                <p className="text-xs text-amber-600 mt-1">
                  El pago aún no ha sido confirmado por la pasarela.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Acciones ───────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Link
            href="/pedidos"
            className="flex-1 text-center bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-700 transition-colors"
          >
            Ver mis pedidos
          </Link>
          <Link
            href="/catalogo"
            className="flex-1 text-center bg-white text-gray-900 border border-gray-300 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors"
          >
            Seguir comprando
          </Link>
        </div>

      </div>
    </div>
  )
}
