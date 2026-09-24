import { prisma } from '@h2r/database'
import { verifyOrderAccessToken } from '@/lib/order-access-token'

export type OrderConfirmationItem = {
  id: string
  productName: string
  productSlug: string
  productSku: string
  productImage: string | null
  quantity: number
  priceAtPurchase: number
}

export type OrderConfirmation = {
  id: string
  status: string
  total: number
  createdAt: Date
  paymentProvider: string
  shippingAddress: {
    fullName: string
    address: string
    city: string
    department: string
    phone: string
    postalCode?: string
    notes?: string
  }
  items: OrderConfirmationItem[]
  /** true si el pedido se hizo sin cuenta (guest checkout). */
  isGuest: boolean
}

/**
 * Formas de acreditar acceso a un pedido:
 *   - userId: sesión del dueño del pedido.
 *   - token:  enlace firmado (invitados o correo) — ver lib/order-access-token.ts.
 */
export type OrderAccess = { userId?: string | null; token?: string | null }

/** true si la sesión es la dueña del pedido o el token firmado es válido. */
export function canAccessOrder(order: { id: string; userId: string | null }, access: OrderAccess): boolean {
  if (access.userId && order.userId === access.userId) return true
  return verifyOrderAccessToken(order.id, access.token)
}

export async function getOrderConfirmation(orderId: string, access: OrderAccess): Promise<OrderConfirmation | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: { select: { name: true, slug: true, sku: true, images: true } },
        },
      },
    },
  })

  if (!order || !canAccessOrder(order, access)) return null

  const addr = order.shippingAddress as {
    fullName?: string
    address?: string
    city?: string
    department?: string
    phone?: string
    postalCode?: string
    notes?: string
  }

  return {
    id: order.id,
    status: order.status,
    total: order.total,
    createdAt: order.createdAt,
    paymentProvider: order.paymentProvider,
    isGuest: order.userId === null,
    shippingAddress: {
      fullName: addr.fullName ?? '',
      address: addr.address ?? '',
      city: addr.city ?? '',
      department: addr.department ?? '',
      phone: addr.phone ?? '',
      postalCode: addr.postalCode,
      notes: addr.notes,
    },
    items: order.items.map((item) => ({
      id: item.id,
      productName: item.product.name,
      productSlug: item.product.slug,
      productSku: item.product.sku,
      productImage: item.product.images[0] ?? null,
      quantity: item.quantity,
      priceAtPurchase: item.priceAtPurchase,
    })),
  }
}
