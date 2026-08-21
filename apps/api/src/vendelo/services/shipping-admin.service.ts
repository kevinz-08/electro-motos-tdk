import { Injectable, Inject, Logger } from '@nestjs/common'
import {
  IOrderRepository,
  IShipmentRepository,
  IVendeloShippingPort,
  ShipmentExceptionDetail,
} from '@h2r/domain'
import {
  VendeloService,
  GenerateLabelsResponse,
  GetExceptionsParams,
  LabelFormat,
  LabelOutput,
} from '../../infrastructure/services/VendeloService'
import {
  VendeloOrderQueueService,
  MAX_ATTEMPTS as MAX_QUEUE_ATTEMPTS,
} from '../../infrastructure/services/VendeloOrderQueueService'
import {
  ORDER_REPOSITORY,
  SHIPMENT_REPOSITORY,
  VENDELO_SHIPPING_PORT,
} from '../../infrastructure/injection-tokens'

/**
 * Estado consolidado del despacho de un pedido, tal como lo consume el apartado
 * "Guía Vendelo" del panel admin. Reúne en una sola respuesta las tres fuentes
 * que hoy viven separadas: Order.vendeloOrderId, VendeloOrderQueue y Shipment.
 */
export interface ShippingStatusView {
  orderId: string
  deliveryMethod: 'HOME_DELIVERY' | 'STORE_PICKUP'
  orderStatus: string
  vendeloOrderId: string | null
  queue: {
    status: string
    attempts: number
    maxAttempts: number
    lastError: string | null
    nextRetry: string
  } | null
  shipment: {
    status: string
    trackingNumber: string | null
    carrier: string | null
    labelUrl: string | null
    updatedAt: string
  } | null
  /**
   * Qué acciones tiene sentido ofrecer. Se calcula acá y no en el cliente para
   * que la máquina de estados viva en un solo lugar (el servidor manda).
   */
  actions: {
    canRequeue: boolean
    canCreateShipment: boolean
    canGenerateLabel: boolean
  }
}

/**
 * Servicio de aplicación NestJS para operaciones logísticas admin que no tienen
 * reglas de negocio propias — solo resolución de IDs internos → Vendelo y delegación.
 *
 * Operaciones con lógica de dominio (CreateShipments, ResolveShipmentException)
 * se implementan como use cases en packages/domain y son invocadas directamente
 * desde el controller.
 */
@Injectable()
export class ShippingAdminService {
  private readonly logger = new Logger(ShippingAdminService.name)

  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orderRepo: IOrderRepository,
    @Inject(SHIPMENT_REPOSITORY) private readonly shipmentRepo: IShipmentRepository,
    @Inject(VENDELO_SHIPPING_PORT) private readonly shippingPort: IVendeloShippingPort,
    private readonly vendeloService: VendeloService,
    private readonly orderQueue: VendeloOrderQueueService,
  ) {}

  /**
   * Estado consolidado del despacho de un pedido. Retorna null si el pedido no existe.
   *
   * Las tres lecturas son independientes entre sí, así que van en paralelo:
   * el modal del admin las pide en cada apertura.
   */
  async getShippingStatus(orderId: string): Promise<ShippingStatusView | null> {
    const order = await this.orderRepo.findById(orderId)
    if (!order) return null

    // vendeloOrderId no vive en la entidad de dominio Order — se resuelve con el
    // mismo helper batch que usan generateLabels/requestPickup.
    const [[vendeloRow], shipment, queue] = await Promise.all([
      this.orderRepo.findVendeloOrderIdsBatch([orderId]),
      this.shipmentRepo.findByOrderId(orderId),
      this.orderQueue.findByOrderId(orderId),
    ])

    const vendeloOrderId = vendeloRow?.vendeloOrderId ?? null
    const isPickup = order.deliveryMethod === 'STORE_PICKUP'
    const queueInFlight = queue?.status === 'PENDING' || queue?.status === 'PROCESSING'

    return {
      orderId,
      deliveryMethod: order.deliveryMethod,
      orderStatus: order.status,
      vendeloOrderId,
      queue: queue
        ? {
            status: queue.status,
            attempts: queue.attempts,
            maxAttempts: MAX_QUEUE_ATTEMPTS,
            lastError: queue.lastError,
            nextRetry: queue.nextRetry.toISOString(),
          }
        : null,
      shipment: shipment
        ? {
            status: shipment.status,
            trackingNumber: shipment.trackingNumber,
            carrier: shipment.carrier,
            labelUrl: shipment.labelUrl,
            updatedAt: shipment.updatedAt.toISOString(),
          }
        : null,
      actions: {
        // Reintentar solo tiene sentido si nunca llegó a Vendelo y nadie lo está procesando.
        canRequeue: !isPickup && !vendeloOrderId && !queueInFlight,
        // El envío se crea sobre un pedido que ya existe en Vendelo y aún no tiene guía.
        canCreateShipment: !isPickup && !!vendeloOrderId && !shipment,
        // La etiqueta solo existe una vez creado el envío.
        canGenerateLabel: !isPickup && !!vendeloOrderId && !!shipment,
      },
    }
  }

  /**
   * Genera etiquetas PDF/URL para los pedidos indicados.
   * Resuelve vendeloOrderIds en lote y omite pedidos sin asignación.
   * Si output=BASE64, el caller debe convertir `data` a buffer y servir como PDF.
   */
  async generateLabels(
    orderIds: string[],
    format: LabelFormat,
    output: LabelOutput = 'URL',
  ): Promise<GenerateLabelsResponse & { skipped: string[] }> {
    const rows = await this.orderRepo.findVendeloOrderIdsBatch(orderIds)

    const vendeloIds: string[] = []
    const skipped: string[] = []
    for (const row of rows) {
      if (row.vendeloOrderId) vendeloIds.push(row.vendeloOrderId)
      else skipped.push(row.id)
    }

    if (!vendeloIds.length) {
      this.logger.warn(`generateLabels: ningún pedido tiene vendeloOrderId — skipped=${skipped.join(',')}`)
      return { status: 'SUCCESS', order_ids: [], output, data: '', skipped }
    }

    const result = await this.vendeloService.generateLabels(vendeloIds, format, output)

    // Con output=URL para un único pedido, guardamos la URL en Shipment.labelUrl.
    // Solo para un pedido: con varios, Vendelo devuelve un único PDF combinado y
    // escribir esa URL en cada Shipment sería engañoso. La URL expira, así que es
    // una referencia de auditoría — la UI del admin descarga siempre en BASE64.
    if (output === 'URL' && result.data && vendeloIds.length === 1) {
      const orderId = rows.find((r) => r.vendeloOrderId)?.id
      if (orderId) await this.persistLabelUrl(orderId, result.data)
    }

    return { ...result, skipped }
  }

  /**
   * Escribe labelUrl sin tocar el status del envío.
   *
   * Usa atomicUpdateStatus con from === to a propósito: es el único método del
   * repositorio que actualiza campos sueltos sin sobrescribir tracking/carrier
   * (upsert los pisaría con null). Si el poller cambió el status en el intermedio,
   * el update no aplica y simplemente no persistimos la URL — es dato accesorio.
   */
  private async persistLabelUrl(orderId: string, labelUrl: string): Promise<void> {
    const shipment = await this.shipmentRepo.findByOrderId(orderId)
    if (!shipment) return
    await this.shipmentRepo.atomicUpdateStatus(orderId, shipment.status, shipment.status, { labelUrl })
  }

  /**
   * Lista novedades de envío paginadas desde Vendelo.
   * No requiere resolución de IDs internos — el admin trabaja con IDs de Vendelo.
   */
  async getExceptions(params: GetExceptionsParams = {}) {
    return this.vendeloService.getExceptions(params)
  }

  /** Detalle de una novedad incluyendo possible_replies. */
  async getException(id: string): Promise<ShipmentExceptionDetail> {
    return this.shippingPort.getException(id)
  }

  /**
   * Solicita recolección de paquetes para los pedidos indicados.
   * Resuelve vendeloOrderIds en lote.
   */
  async requestPickup(
    orderIds: string[],
  ): Promise<{ pickups: unknown[]; skipped: string[] }> {
    const rows = await this.orderRepo.findVendeloOrderIdsBatch(orderIds)

    const vendeloIds: string[] = []
    const skipped: string[] = []
    for (const row of rows) {
      if (row.vendeloOrderId) vendeloIds.push(row.vendeloOrderId)
      else skipped.push(row.id)
    }

    if (!vendeloIds.length) {
      this.logger.warn(`requestPickup: ningún pedido tiene vendeloOrderId — skipped=${skipped.join(',')}`)
      return { pickups: [], skipped }
    }

    const result = await this.vendeloService.requestPickup(vendeloIds)
    return { ...result, skipped }
  }
}
