import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getOrderHistory } from '@/lib/queries/getOrderHistory'
import { OrderStatusBadge } from '@/components/store/OrderStatusBadge'

export const metadata: Metadata = {
  title: 'Mis pedidos',
  description: 'Consulta el historial y estado de tus pedidos.',
  robots: { index: false, follow: false },
}

interface PageProps {
  searchParams: Promise<{ page?: string }>
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
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export default async function PedidosPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/login?callbackUrl=/pedidos')

  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam ?? '1'))

  const { orders, total, totalPages } = await getOrderHistory(session.user.id, page)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900">Mis pedidos</h1>
          {total > 0 && (
            <p className="text-gray-500 mt-1 text-sm">
              {total} {total === 1 ? 'pedido' : 'pedidos'} en total
            </p>
          )}
        </div>

        {/* Empty state */}
        {orders.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <div className="text-5xl mb-4">📦</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Aún no tienes pedidos</h2>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              Cuando realices una compra, podrás seguir el estado de tu pedido desde aquí.
            </p>
            <Link
              href="/catalogo"
              className="inline-block bg-sky-400 text-black px-8 py-3 rounded-xl font-bold hover:bg-sky-500 hover:text-white transition-colors"
            >
              Ver catálogo
            </Link>
          </div>
        )}

        {/* Orders list */}
        {orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((order) => (
              <article
                key={order.id}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors"
              >
                {/* Card header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-sm font-bold text-gray-900">
                      #{order.id.slice(-8).toUpperCase()}
                    </span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{formatDate(order.createdAt)}</span>
                    <span className="font-bold text-gray-900 text-base">{formatCOP(order.total)}</span>
                  </div>
                </div>

                {/* Items */}
                <div className="px-6 py-4">
                  <ul className="space-y-3">
                    {order.items.map((item) => (
                      <li key={item.id} className="flex items-center gap-4">
                        {/* Thumbnail */}
                        {item.productImage ? (
                          <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                            <Image
                              src={item.productImage}
                              alt={item.productName}
                              fill
                              className="object-cover"
                              sizes="56px"
                            />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-xl">
                            🛒
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/producto/${item.productSlug}`}
                            className="text-sm font-semibold text-gray-900 hover:text-sky-600 transition-colors line-clamp-1"
                          >
                            {item.productName}
                          </Link>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {item.quantity} × {formatCOP(item.priceAtPurchase)}
                          </p>
                        </div>

                        {/* Subtotal */}
                        <p className="text-sm font-semibold text-gray-700 shrink-0">
                          {formatCOP(item.quantity * item.priceAtPurchase)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Card footer */}
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <p className="text-xs text-gray-400">
                    Envío a {order.shippingCity}, {order.shippingDepartment}
                  </p>
                  <Link
                    href={`/checkout/confirmacion?orderId=${order.id}`}
                    className="text-xs font-semibold text-sky-600 hover:text-sky-800 transition-colors"
                  >
                    Ver detalle →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <nav className="flex items-center justify-center gap-2 mt-8" aria-label="Paginación">
            {page > 1 && (
              <Link
                href={`/pedidos?page=${page - 1}`}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                ← Anterior
              </Link>
            )}

            <span className="px-4 py-2 text-sm text-gray-500">
              Página {page} de {totalPages}
            </span>

            {page < totalPages && (
              <Link
                href={`/pedidos?page=${page + 1}`}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Siguiente →
              </Link>
            )}
          </nav>
        )}
      </div>
    </div>
  )
}
