/**
 * Contrato del repositorio de pedidos.
 *
 * Implementado por PrismaOrderRepository en infrastructure/repositories/.
 * Los use cases CreateOrder y ConfirmPayment dependen de esta interfaz.
 */
import { Order, OrderStatus, OrderItem, ShippingAddress, PaymentProvider, PaymentStatus } from '@/domain/entities/Order'

/**
 * Resultado de `transitionFromPending`.
 *  - `applied: true`  → Este webhook ejecutó la transición (fue el primero en llegar).
 *  - `applied: false` → El pedido ya no estaba en PENDING; el cambio lo hizo un webhook anterior.
 *                       Esto es idempotencia: no es error, pero el caller debería evitar efectos
 *                       secundarios (ej: enviar email al cliente por segunda vez).
 */
export interface PaymentTransitionResult {
  applied: boolean
}

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
  /**
   * Transición atómica desde PENDING que actualiza Order.status, Payment.status y
   * Payment.externalId en una sola transacción de BD.
   *
   * Atomicidad garantiza:
   *   - Idempotencia correcta ante reintentos del webhook: solo el primero aplica.
   *   - Order.status y Payment.status quedan siempre consistentes.
   *
   * El caller debe verificar `applied` para decidir efectos secundarios
   * (ej: enviar email, descontar stock).
   */
  transitionFromPending(
    orderId: string,
    to: { orderStatus: OrderStatus; paymentStatus: PaymentStatus; externalId: string },
  ): Promise<PaymentTransitionResult>
  /** Calcula los ingresos del día (pedidos PAID creados hoy). Retorna centavos COP. */
  getTodayRevenue(): Promise<number>
  /** Cuenta pedidos con status PENDING. Para alertas en el dashboard. */
  getPendingCount(): Promise<number>
}
