import { ShipmentExceptionDetail, ExceptionResolution } from '../entities/ShipmentException'
import { ShipmentStatus } from '../entities/Shipment'

/** Error reportado cuando Vendelo no encuentra el pedido solicitado por ID. */
export class VendeloOrderNotFoundError extends Error {
  constructor(public readonly vendeloOrderId: string) {
    super(`Vendelo order "${vendeloOrderId}" not found`)
    this.name = 'VendeloOrderNotFoundError'
  }
}

/**
 * Snapshot mínimo del pedido en Vendelo que el polling necesita:
 * estado del pedido + datos del shipment para reflejarlos en nuestra BD.
 *
 * Vendelo usa los mismos identificadores de estado que nuestro enum
 * `ShipmentStatus`, por lo que el mapeo es 1:1.
 */
export interface VendeloOrderSnapshot {
  id: string
  status: ShipmentStatus
  trackingNumber: string | null
  carrier: string | null
}

/**
 * Puerto de dominio para las operaciones de envío logístico con Vendelo.
 *
 * Implementado por VendeloService en apps/api/src/infrastructure/services/.
 * El dominio no conoce HTTP ni NestJS — solo este contrato.
 */
export interface IVendeloShippingPort {
  /**
   * Dispara la creación asincrónica de envíos en Vendelo.
   * Debe llamarse con los IDs de Vendelo (vendeloOrderId), no los IDs internos.
   */
  createShipments(vendeloOrderIds: string[]): Promise<{ message: string }>

  /** Obtiene el detalle de una novedad de transporte por su ID de Vendelo. */
  getException(id: string): Promise<ShipmentExceptionDetail>

  /** Resuelve una novedad de transporte con el tipo de respuesta y notas indicadas. */
  resolveException(id: string, resolution: ExceptionResolution): Promise<{ message: string }>

  /**
   * Lee el estado actual de un pedido desde Vendelo. Usado por el cron de
   * polling para sincronizar el envío cuando los webhooks no están disponibles.
   *
   * @throws {VendeloOrderNotFoundError} si Vendelo retorna 404 — el caller
   *         debe loguear y continuar con el siguiente pedido, no fallar el batch.
   */
  getOrder(vendeloOrderId: string): Promise<VendeloOrderSnapshot>
}
