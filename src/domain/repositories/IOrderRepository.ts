/**
 * Contrato del repositorio de pedidos.
 *
 * Implementado por PrismaOrderRepository en infrastructure/repositories/.
 * Los use cases CreateOrder y ConfirmPayment dependen de esta interfaz.
 */
import { Order, OrderStatus, OrderItem, ShippingAddress, PaymentProvider } from '@/domain/entities/Order'

/**
 * Datos necesarios para crear un nuevo pedido.
 * Los items ya incluyen el priceAtPurchase (precio capturado por CreateOrder use case).
 */
export interface CreateOrderInput {
  /** ID del usuario autenticado que realiza el pedido */
  userId: string
  /** Lista de ítems con precio capturado en el momento de la compra */
  items: Array<{ productId: string; quantity: number; priceAtPurchase: number }>
  /** Dirección de envío — se serializa como JSON en la BD */
  shippingAddress: ShippingAddress
  /** Pasarela de pago seleccionada */
  paymentProvider: PaymentProvider
  /** Total del pedido en centavos COP (calculado por CreateOrder use case) */
  total: number
}

/**
 * Contrato de acceso a datos de pedidos.
 * Implementado por PrismaOrderRepository en infrastructure/repositories/.
 */
export interface IOrderRepository {
  /** Busca un pedido por ID, incluyendo items y pago (necesario para el webhook) */
  findById(id: string): Promise<Order | null>
  /** Retorna todos los pedidos de un usuario ordenados por fecha desc */
  findByUserId(userId: string): Promise<Order[]>
  /** Lista pedidos con filtros opcionales para el panel admin */
  findAll(filters?: { status?: OrderStatus; page?: number; limit?: number }): Promise<Order[]>
  /** Crea un pedido con sus ítems y el registro de pago en una sola transacción */
  create(input: CreateOrderInput): Promise<Order>
  /** Cambia el estado del pedido (PENDING→PAID, PAID→SHIPPED, etc.) */
  updateStatus(id: string, status: OrderStatus): Promise<void>
  /**
   * Registra el ID de transacción externo en el Payment.
   * Se llama desde ConfirmPayment cuando llega el webhook de la pasarela.
   */
  updatePaymentExternalId(orderId: string, externalId: string): Promise<void>
  /** Calcula los ingresos del día (pedidos PAID creados hoy). Retorna centavos COP. */
  getTodayRevenue(): Promise<number>
  /** Cuenta pedidos con status PENDING. Para alertas en el dashboard. */
  getPendingCount(): Promise<number>
}
