import { ShipmentExceptionDetail, ExceptionResolution } from '../entities/ShipmentException'

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
}
