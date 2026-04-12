import Link from 'next/link'
import { PrismaOrderRepository } from '@/infrastructure/repositories/PrismaOrderRepository'

interface PageProps {
  searchParams: Promise<{ orderId?: string }>
}

export default async function ConfirmacionPage({ searchParams }: PageProps) {
  const { orderId } = await searchParams
  let orderStatus = 'PENDING'

  if (orderId) {
    const repo = new PrismaOrderRepository()
    const order = await repo.findById(orderId)
    orderStatus = order?.status ?? 'PENDING'
  }

  const isPaid = orderStatus === 'PAID'

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="text-6xl mb-6">{isPaid ? '✅' : '⏳'}</div>
      <h1 className="text-3xl font-bold text-gray-900 mb-3">
        {isPaid ? '¡Pedido confirmado!' : 'Pago en procesamiento'}
      </h1>
      <p className="text-gray-500 mb-2">
        {isPaid
          ? 'Recibirás un email con los detalles de tu pedido.'
          : 'Tu pago está siendo procesado. Te notificaremos por email cuando se confirme.'}
      </p>
      {orderId && (
        <p className="text-sm text-gray-400 mb-8">
          Pedido: <span className="font-mono font-medium">{orderId.slice(-8).toUpperCase()}</span>
        </p>
      )}
      <Link
        href="/catalogo"
        className="bg-amber-400 text-gray-900 px-8 py-3 rounded-lg font-bold hover:bg-amber-300 transition-colors"
      >
        Seguir comprando
      </Link>
    </div>
  )
}
